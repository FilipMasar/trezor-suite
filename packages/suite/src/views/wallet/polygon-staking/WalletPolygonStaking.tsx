import { openModal } from '@suite/modal';
import { selectLanguage } from '@suite/settings';
import { formatCoinBalance } from '@suite-common/wallet-utils';
import {
    Button,
    Card,
    Column,
    Grid,
    H2,
    H3,
    H4,
    IconCircle,
    Paragraph,
    Row,
    Text,
} from '@trezor/components';
import { BigNumber } from '@trezor/utils';

import { WalletLayout } from 'src/components/wallet';
import { useDispatch, useLayoutSize, useSelector } from 'src/hooks/suite';
import { selectFullSelectedAccount } from 'src/reducers/wallet/selectedAccountReducer';

import { SPOL_CONTRACT_ADDRESS } from './polygonStakingConstants';

const features = [
    {
        id: 'earn',
        icon: 'piggyBank',
        title: 'Earn rewards',
        text: 'Your stake earns POL rewards automatically — no manual claiming, no validator selection.',
    },
    {
        id: 'liquid',
        icon: 'lockLaminatedOpen',
        title: 'Stay liquid',
        text: 'Receive sPOL 1:1 for your POL. Trade, lend, or use it across DeFi while it keeps accruing rewards.',
    },
    {
        id: 'official',
        icon: 'hexagon',
        title: 'Official primitive',
        text: "Built directly on Polygon Labs' sPOL contract — no third-party custodian, no extra fees.",
    },
] as const;

export const WalletPolygonStaking = () => {
    const dispatch = useDispatch();
    const { isBelowLaptop } = useLayoutSize();
    const locale = useSelector(selectLanguage);
    const selectedAccount = useSelector(selectFullSelectedAccount);
    const { account } = selectedAccount;

    const isStakeAvailable = account?.symbol === 'pol';

    const sPolToken = account?.tokens?.find(
        t => t.contract.toLowerCase() === SPOL_CONTRACT_ADDRESS,
    );
    const sPolBalance = sPolToken?.balance ?? '0';
    const isStaking = new BigNumber(sPolBalance).gt(0);

    const openStakeModal = () => {
        if (!isStakeAvailable) return;
        dispatch(openModal({ type: 'polygon-stake', account }));
    };

    return (
        <WalletLayout title="TR_NAV_STAKING" account={selectedAccount}>
            <Column gap={40} alignItems="stretch">
                <Card>
                    <Column gap={40} alignItems="flex-start">
                        {isStaking ? (
                            <>
                                <Column gap={8}>
                                    <Text intent="neutral" priority="secondary">
                                        Your sPOL position
                                    </Text>
                                    <H2 data-testid="@wallet/polygon-staking/spol-balance">
                                        {formatCoinBalance(sPolBalance, locale)} sPOL
                                    </H2>
                                </Column>
                                <Paragraph intent="neutral" priority="secondary" maxWidth={700}>
                                    Your sPOL keeps earning rewards automatically. Stake more POL
                                    any time to grow your position.
                                </Paragraph>
                            </>
                        ) : (
                            <Column gap={8}>
                                <H3>Liquid stake POL with sPOL</H3>
                                <Paragraph intent="neutral" priority="secondary" maxWidth={700}>
                                    Stake POL and receive sPOL — a liquid staking token that keeps
                                    earning rewards while remaining usable across DeFi. Powered by
                                    the official sPOL contract from Polygon Labs.
                                </Paragraph>
                            </Column>
                        )}

                        <Grid columns={isBelowLaptop ? 1 : 3} gap={24}>
                            {features.map(feature => (
                                <Row key={feature.id} gap={16} alignItems="flex-start">
                                    <Column>
                                        <IconCircle name={feature.icon} intent="brand" size={40} />
                                    </Column>
                                    <Column gap={4}>
                                        <H4>{feature.title}</H4>
                                        <Paragraph intent="neutral" priority="secondary">
                                            {feature.text}
                                        </Paragraph>
                                    </Column>
                                </Row>
                            ))}
                        </Grid>

                        <Button
                            onClick={openStakeModal}
                            isDisabled={!isStakeAvailable}
                            size="large"
                            data-testid={
                                isStaking
                                    ? '@wallet/polygon-staking/stake-more-button'
                                    : '@wallet/polygon-staking/start-staking-button'
                            }
                        >
                            {isStaking ? 'Stake more' : 'Start staking'}
                        </Button>
                    </Column>
                </Card>
            </Column>
        </WalletLayout>
    );
};
