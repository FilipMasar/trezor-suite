import { useForm } from 'react-hook-form';

import { useDevice } from '@suite/device';
import { useTranslation } from '@suite/intl';
import { type Account } from '@suite-common/wallet-types';
import { Button, Column, Input, Paragraph, Tooltip } from '@trezor/components';
import { BigNumber } from '@trezor/utils';

import { setConnectionModal } from 'src/actions/device/deviceSlice';
import { useDispatch } from 'src/hooks/suite';
import { validateDecimals, validateMin } from 'src/utils/suite/validation';

import { buySPOLThunk } from './polygonStakingThunks';

const POL_DECIMALS = 18;

type Props = {
    account: Account;
};

type FormValues = {
    amount: string;
};

export const PolygonStakingForm = ({ account }: Props) => {
    const dispatch = useDispatch();
    const { device, isLocked } = useDevice();
    const { translationString } = useTranslation();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting, isValid },
    } = useForm<FormValues>({ mode: 'onChange' });

    const isDeviceConnected = !!device?.connected && !!device?.available;
    const isDeviceLocked = isDeviceConnected && isLocked();

    const submit = handleSubmit(async ({ amount }) => {
        try {
            await dispatch(
                buySPOLThunk({
                    accountDescriptor: account.descriptor,
                    networkSymbol: account.symbol,
                    deviceStaticSessionId: account.deviceState,
                    amountInPol: amount,
                }),
            ).unwrap();
            reset();
        } catch {
            // Error toast already surfaced by the thunk; keep the form usable.
        }
    });

    const onClick = () => {
        if (!isDeviceConnected) {
            dispatch(setConnectionModal(true));

            return;
        }
        submit();
    };

    const { ref: amountRef, ...amountField } = register('amount', {
        required: 'Amount is required.',
        validate: {
            min: validateMin(translationString),
            decimals: validateDecimals(translationString, { decimals: POL_DECIMALS }),
            balance: (value: string) =>
                new BigNumber(value).lte(account.formattedBalance) || 'Insufficient POL balance.',
        },
    });

    const getTooltipContent = () => {
        if (!isDeviceConnected) return 'Connect your Trezor to stake.';
        if (isDeviceLocked) return 'Unlock your Trezor to stake.';

        return undefined;
    };

    return (
        <form onSubmit={submit}>
            <Column gap={12} alignItems="flex-start">
                <Paragraph intent="neutral" priority="secondary">
                    Available balance: {account.formattedBalance} POL
                </Paragraph>
                <Input
                    label="Amount (POL)"
                    inputMode="decimal"
                    placeholder="0.00"
                    hasError={!!errors.amount}
                    bottomText={errors.amount?.message}
                    innerRef={amountRef}
                    data-testid="@wallet/polygon-staking/amount"
                    {...amountField}
                />
                <Tooltip content={getTooltipContent()}>
                    <Button
                        type="button"
                        onClick={onClick}
                        isDisabled={!isValid || isSubmitting || isDeviceLocked}
                        isLoading={isSubmitting}
                        data-testid="@wallet/polygon-staking/stake-button"
                    >
                        Stake POL
                    </Button>
                </Tooltip>
            </Column>
        </form>
    );
};
