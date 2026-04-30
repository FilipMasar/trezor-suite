import { fromWei } from 'web3-utils';

import { createEvmEncoder } from '@suite-common/calldata/src/encoder/evm';
import { selectSelectedDevice } from '@suite-common/device';
import { createThunk } from '@suite-common/redux-utils';
import { notificationsActions } from '@suite-common/toast-notifications';
import { type NetworkSymbol } from '@suite-common/wallet-config';
import { selectAccounts } from '@suite-common/wallet-core';
import { ethereumGetCurrentNonceThunk } from '@suite-common/wallet-core/src/send/sendFormEthereumThunks';
import { type Account, type AccountDescriptor } from '@suite-common/wallet-types';
import {
    asAmountSubunit,
    asAmountUnit,
    getAccountIdentity,
    getEthereumEstimateFeeParams,
    prepareEthereumTransaction,
    subunitsToUnits,
    unitsToSubunits,
} from '@suite-common/wallet-utils';
import TrezorConnect, { type StaticSessionId } from '@trezor/connect';
import { BigNumber } from '@trezor/utils';

const SPOL_CHILD_CONTRACT_ADDRESS = '0xd1CD49A08AeF3Af93457aEc17C786C2b7F48eCd7';
const POLYGON_CHAIN_ID = 137;
const POL_DECIMALS = 18;

// official ABI from https://github.com/0xPolygon/sPOL-contracts
const buySPOLAbi = [
    {
        type: 'function',
        name: 'buySPOL',
        inputs: [{ name: '_polAmount', type: 'uint256' }],
        outputs: [],
        stateMutability: 'payable',
    },
] as const;

const convertPOLToSPOLAbi = [
    {
        type: 'function',
        name: 'convertPOLToSPOL',
        inputs: [{ name: '_polAmount', type: 'uint256' }],
        outputs: [{ name: '', type: 'uint256' }],
        stateMutability: 'view',
    },
] as const;

const encodeBuySPOL = createEvmEncoder(buySPOLAbi);
const encodeConvertPOLToSPOL = createEvmEncoder(convertPOLToSPOLAbi);

export const convertPOLToSPOL = async (account: Account, amountInPol: string): Promise<string> => {
    if (account.networkType !== 'ethereum' || account.symbol !== 'pol') {
        throw new Error('Polygon account required.');
    }

    const amountWei = unitsToSubunits({
        value: asAmountUnit(new BigNumber(amountInPol)),
        decimals: POL_DECIMALS,
    });

    const data = encodeConvertPOLToSPOL({ _polAmount: BigInt(amountWei.toString(10)) });

    const result = await TrezorConnect.blockchainEvmRpcCall({
        coin: account.symbol,
        identity: getAccountIdentity(account),
        from: account.descriptor,
        to: SPOL_CHILD_CONTRACT_ADDRESS,
        data,
    });

    if (!result.success) {
        throw new Error(result.error.message);
    }

    const sPolWei = asAmountSubunit(new BigNumber(BigInt(result.payload.data).toString(10)));

    return subunitsToUnits({ value: sPolWei, decimals: POL_DECIMALS }).toString();
};

const fail = (dispatch: any, error: string) => {
    dispatch(notificationsActions.addToast({ type: 'sign-tx-error', error }));

    return error;
};

export const buySPOLThunk = createThunk<
    { txid: string },
    {
        accountDescriptor: AccountDescriptor;
        networkSymbol: NetworkSymbol;
        deviceStaticSessionId: StaticSessionId;
        amountInPol: string;
    },
    { rejectValue: string }
>(
    'polygon-staking/buySPOL',
    async (
        { accountDescriptor, networkSymbol, deviceStaticSessionId, amountInPol },
        { dispatch, getState, rejectWithValue },
    ) => {
        const account = selectAccounts(getState()).find(
            a =>
                a.descriptor === accountDescriptor &&
                a.symbol === networkSymbol &&
                a.deviceState === deviceStaticSessionId,
        );
        const device = selectSelectedDevice(getState());

        if (!account || account.networkType !== 'ethereum' || account.symbol !== 'pol') {
            return rejectWithValue(fail(dispatch, 'Polygon account required.'));
        }
        if (!device) {
            return rejectWithValue(fail(dispatch, 'No device connected.'));
        }

        const amountWei = unitsToSubunits({
            value: asAmountUnit(new BigNumber(amountInPol)),
            decimals: POL_DECIMALS,
        });

        const data = encodeBuySPOL({ _polAmount: BigInt(amountWei.toString(10)) });

        const estimateParams = getEthereumEstimateFeeParams(
            SPOL_CHILD_CONTRACT_ADDRESS,
            amountInPol,
            undefined,
            data,
        );
        const fee = await TrezorConnect.blockchainEstimateFee({
            coin: account.symbol,
            identity: getAccountIdentity(account),
            request: {
                blocks: [2],
                specific: { from: account.descriptor, ...estimateParams },
            },
        });
        if (!fee.success) {
            return rejectWithValue(fail(dispatch, `Fee estimate failed: ${fee.error.message}`));
        }
        const level = fee.payload.levels[0];
        const eip1559 = level.eip1559?.medium;
        if (!level.feeLimit || !eip1559?.maxFeePerGas || !eip1559?.maxPriorityFeePerGas) {
            return rejectWithValue(fail(dispatch, 'Fee estimate missing EIP-1559 fields.'));
        }

        const { nonce } = await dispatch(
            ethereumGetCurrentNonceThunk({
                selectedAccount: account as Account & { networkType: 'ethereum' },
            }),
        ).unwrap();

        const transaction = prepareEthereumTransaction({
            chainId: POLYGON_CHAIN_ID,
            to: SPOL_CHILD_CONTRACT_ADDRESS,
            amount: amountInPol,
            data,
            gasLimit: level.feeLimit,
            maxFeePerGas: fromWei(eip1559.maxFeePerGas, 'gwei'),
            maxPriorityFeePerGas: fromWei(eip1559.maxPriorityFeePerGas, 'gwei'),
            nonce,
        });

        const signed = await TrezorConnect.ethereumSignTransaction({
            device: {
                path: device.path,
                instance: device.instance,
                state: device.state,
                useEmptyPassphrase: device.useEmptyPassphrase,
            },
            path: account.path,
            transaction,
        });
        if (!signed.success) {
            return rejectWithValue(fail(dispatch, signed.error.message));
        }

        const push = await TrezorConnect.pushTransaction({
            tx: signed.payload.serializedTx,
            coin: account.symbol,
            identity: getAccountIdentity(account),
        });
        if (!push.success) {
            return rejectWithValue(fail(dispatch, push.error.message));
        }

        const { txid } = push.payload;
        dispatch(
            notificationsActions.addToast({
                type: 'tx-staked',
                formattedAmount: `${amountInPol} POL`,
                descriptor: account.descriptor,
                symbol: account.symbol,
                txid,
            }),
        );

        return { txid };
    },
);
