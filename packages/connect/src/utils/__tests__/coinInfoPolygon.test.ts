import coinsJSONEth from '@trezor/connect-data/files/coins-eth.json';

import { getEthereumNetwork, parseCoinsJson } from '../../data/coinInfo';

describe('coins-eth.json polygon EVM-RPC entry (NET-02)', () => {
    beforeAll(() => {
        // Mirrors deviceFeaturesUtils.test.ts:26-35 — populate ethereumNetworks[]
        // module-level state so getEthereumNetwork() can be exercised below.
        parseCoinsJson(coinsJSONEth);
    });

    it('contains the existing blockbook entry for Polygon (chain 137) — unchanged', () => {
        const polBlockbook = coinsJSONEth.eth.find(
            entry => entry.chain_id === 137 && entry.blockchain_link.type === 'blockbook',
        );
        expect(polBlockbook).toBeDefined();
        expect(polBlockbook!.blockchain_link.url).toEqual(['https://pol.trezor.io']);
        expect(polBlockbook!.shortcut).toBe('POL');
    });

    it('contains a new evm-rpc entry for Polygon (chain 137)', () => {
        const polRpc = coinsJSONEth.eth.find(
            entry => entry.chain_id === 137 && entry.blockchain_link.type === 'evm-rpc',
        );
        expect(polRpc).toBeDefined();
        expect(polRpc!.blockchain_link.url).toEqual(['https://polygon-rpc.com']);
        expect(polRpc!.shortcut).toBe('POL');
    });

    // Resolves Open Question A1 — runtime semantics of parseEthereumNetworksJson
    // when two array elements share chain: "pol". Both raw entries must be present;
    // getEthereumNetwork('POL') returns the FIRST match (the blockbook entry) per
    // Array.find — see PATTERNS.md "Special Risks" #2. The evm-rpc entry is reachable
    // at runtime via BackendManager.patchCoinInfo overlay (debug-mode "Custom RPC").
    it('parseEthereumNetworksJson registers both Polygon entries (both-backends)', () => {
        const polEntries = coinsJSONEth.eth.filter(entry => entry.chain_id === 137);
        expect(polEntries).toHaveLength(2);

        const network = getEthereumNetwork('POL');
        expect(network).toBeDefined();
        expect(network!.chainId).toBe(137);
    });
});
