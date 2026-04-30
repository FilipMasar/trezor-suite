import { supportedNetworkSymbols } from '../ethereumStaking';

describe('ethereumStaking misroute guard (D-12)', () => {
    // RED-LINE: adding 'pol' (or any other symbol) here routes Polygon stake
    // transactions to Everstake's L1 contract on Ethereum mainnet (chain 1) —
    // catastrophic. The Polygon LST flow takes its own path via the new
    // suite-common/staking-polygon/ package (Phases 3+). See PROJECT.md and
    // ROADMAP.md "RISK NOTE (all phases)".
    it('contains exactly ["eth", "thod"] — never add pol', () => {
        expect(supportedNetworkSymbols).toEqual(['eth', 'thod']);
    });

    // Belt-and-braces — explicit negative matcher gives a clearer failure
    // message if a future PR adds 'pol' specifically.
    it('does not contain pol', () => {
        expect(supportedNetworkSymbols).not.toContain('pol');
    });
});
