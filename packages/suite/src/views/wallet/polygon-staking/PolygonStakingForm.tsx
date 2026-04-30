import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';

import useDebounce from 'react-use/lib/useDebounce';

import { useDevice } from '@suite/device';
import { Translation, useTranslation } from '@suite/intl';
import { type Account } from '@suite-common/wallet-types';
import { Button, Column, FractionButton, InfoItem, Input, Row, Tooltip } from '@trezor/components';
import { spacings } from '@trezor/theme';
import { BigNumber } from '@trezor/utils';

import { setConnectionModal } from 'src/actions/device/deviceSlice';
import { FormattedCryptoAmount } from 'src/components/suite/FormattedCryptoAmount';
import { useDispatch } from 'src/hooks/suite';
import { validateDecimals, validateMin } from 'src/utils/suite/validation';

import { buySPOLThunk, convertPOLToSPOL } from './polygonStakingThunks';

const POL_DECIMALS = 18;

type Props = {
    account: Account;
    onSuccess?: () => void;
};

type FormValues = {
    amount: string;
};

export const PolygonStakingForm = ({ account, onSuccess }: Props) => {
    const dispatch = useDispatch();
    const { device, isLocked } = useDevice();
    const { translationString } = useTranslation();

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, isSubmitting, isValid },
    } = useForm<FormValues>({ mode: 'onChange' });

    const amount = watch('amount');
    const [previewSPOL, setPreviewSPOL] = useState<string | null>(null);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const latestAmountRef = useRef<string>('');

    useDebounce(
        () => {
            if (!amount || !isValid) {
                setPreviewSPOL(null);
                setPreviewError(null);
                setIsPreviewLoading(false);

                return;
            }
            latestAmountRef.current = amount;
            setIsPreviewLoading(true);
            convertPOLToSPOL(account, amount)
                .then(result => {
                    if (latestAmountRef.current === amount) {
                        setPreviewSPOL(result);
                        setPreviewError(null);
                        setIsPreviewLoading(false);
                    }
                })
                .catch(error => {
                    console.error('convertPOLToSPOL failed', error);
                    if (latestAmountRef.current === amount) {
                        setPreviewSPOL(null);
                        setPreviewError(error?.message ?? 'unknown error');
                        setIsPreviewLoading(false);
                    }
                });
        },
        300,
        [amount, isValid],
    );

    const isDeviceConnected = !!device?.connected && !!device?.available;
    const isDeviceLocked = isDeviceConnected && isLocked();

    const balance = new BigNumber(account.formattedBalance);
    const hasBalance = balance.gt(0);

    const setRatio = (divisor: number) => {
        const amount = balance
            .dividedBy(divisor)
            .decimalPlaces(POL_DECIMALS, BigNumber.ROUND_DOWN)
            .toString();
        setValue('amount', amount, { shouldDirty: true, shouldValidate: true });
    };

    const setMax = () => {
        setValue('amount', account.formattedBalance, { shouldDirty: true, shouldValidate: true });
    };

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
            onSuccess?.();
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

    const getPreviewContent = () => {
        if (isPreviewLoading) return 'Calculating…';
        if (previewSPOL) return `${previewSPOL} sPOL`;
        if (previewError) return `Error: ${previewError}`;

        return '—';
    };

    return (
        <form onSubmit={submit}>
            <Column gap={spacings.md} alignItems="stretch">
                <InfoItem label={<Translation id="TR_STAKE_AVAILABLE" />}>
                    <FormattedCryptoAmount
                        value={account.formattedBalance}
                        symbol={account.symbol}
                        isBalance
                        data-testid="@wallet/polygon-staking/available-balance"
                    />
                </InfoItem>
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
                <InfoItem label="You will receive">
                    <span data-testid="@wallet/polygon-staking/preview-spol">
                        {getPreviewContent()}
                    </span>
                </InfoItem>
                <Row gap={spacings.xs}>
                    <FractionButton
                        id="polygon-stake-10"
                        isDisabled={!hasBalance}
                        onClick={() => setRatio(10)}
                    >
                        <Translation id="TR_FRACTION_BUTTONS_10_PERCENT" />
                    </FractionButton>
                    <FractionButton
                        id="polygon-stake-25"
                        isDisabled={!hasBalance}
                        onClick={() => setRatio(4)}
                    >
                        <Translation id="TR_FRACTION_BUTTONS_25_PERCENT" />
                    </FractionButton>
                    <FractionButton
                        id="polygon-stake-50"
                        isDisabled={!hasBalance}
                        onClick={() => setRatio(2)}
                    >
                        <Translation id="TR_FRACTION_BUTTONS_50_PERCENT" />
                    </FractionButton>
                    <FractionButton
                        id="polygon-stake-max"
                        isDisabled={!hasBalance}
                        onClick={setMax}
                    >
                        <Translation id="TR_FRACTION_BUTTONS_MAX" />
                    </FractionButton>
                </Row>
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
