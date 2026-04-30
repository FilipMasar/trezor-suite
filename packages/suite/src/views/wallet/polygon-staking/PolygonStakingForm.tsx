import { useForm } from 'react-hook-form';

import { useTranslation } from '@suite/intl';
import { selectSelectedDevice } from '@suite-common/device';
import { type Account } from '@suite-common/wallet-types';
import { Button, Column, Input, Paragraph } from '@trezor/components';
import { spacings } from '@trezor/theme';
import { BigNumber } from '@trezor/utils';

import { useDispatch, useSelector } from 'src/hooks/suite';
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
    const device = useSelector(selectSelectedDevice);
    const { translationString } = useTranslation();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting, isValid },
    } = useForm<FormValues>({ mode: 'onChange' });

    const onSubmit = handleSubmit(async ({ amount }) => {
        try {
            await dispatch(buySPOLThunk({ accountKey: account.key, amountInPol: amount })).unwrap();
            reset();
        } catch {
            // Error toast already surfaced by the thunk; keep the form usable.
        }
    });

    const { ref: amountRef, ...amountField } = register('amount', {
        required: 'Amount is required.',
        validate: {
            min: validateMin(translationString),
            decimals: validateDecimals(translationString, { decimals: POL_DECIMALS }),
            balance: (value: string) =>
                new BigNumber(value).lte(account.formattedBalance) || 'Insufficient POL balance.',
        },
    });

    return (
        <form onSubmit={onSubmit}>
            <Column gap={spacings.sm} alignItems="flex-start">
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
                <Button
                    type="submit"
                    isDisabled={!device || !isValid || isSubmitting}
                    isLoading={isSubmitting}
                    data-testid="@wallet/polygon-staking/stake-button"
                >
                    Stake POL
                </Button>
            </Column>
        </form>
    );
};
