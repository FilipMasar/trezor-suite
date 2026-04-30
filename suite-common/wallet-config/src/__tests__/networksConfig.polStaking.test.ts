import { networks } from '../networksConfig';

describe('networksConfig pol staking flag (NET-01)', () => {
    // Adding 'staking' to pol.features makes the per-account Staking tab visible
    // via hasNetworkFeatures(account, 'staking') in AccountNavigation.tsx (line 73).
    // Per D-01: single one-line change, no feature-flag wrapper, no env gate.
    it('declares pol as staking-capable', () => {
        expect(networks.pol.features).toContain('staking');
    });

    // Defensive: ETH 'staking' precedent must be unchanged by Polygon work.
    it('preserves the existing eth staking-capable declaration', () => {
        expect(networks.eth.features).toContain('staking');
    });
});
