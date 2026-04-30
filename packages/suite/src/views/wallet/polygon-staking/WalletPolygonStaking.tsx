import { Column, H2, Paragraph } from '@trezor/components';
import { spacings } from '@trezor/theme';

import { WalletLayout } from 'src/components/wallet';
import { useSelector } from 'src/hooks/suite';
import { selectFullSelectedAccount } from 'src/reducers/wallet/selectedAccountReducer';

import { PolygonStakingForm } from './PolygonStakingForm';

export const WalletPolygonStaking = () => {
    const selectedAccount = useSelector(selectFullSelectedAccount);
    const { account } = selectedAccount;

    return (
        <WalletLayout title="TR_NAV_STAKING" account={selectedAccount}>
            <Column gap={spacings.lg} alignItems="flex-start">
                <Column gap={spacings.sm} alignItems="flex-start">
                    <H2>Polygon Liquid Staking</H2>
                    <Paragraph intent="neutral" priority="secondary">
                        Stake POL and receive a liquid staking token in return — keep your stake
                        earning rewards while remaining usable across DeFi. This page is a
                        proof-of-concept placeholder; the real flow lands in a follow-up.
                    </Paragraph>
                </Column>
                {account?.symbol === 'pol' && <PolygonStakingForm account={account} />}
            </Column>
        </WalletLayout>
    );
};
