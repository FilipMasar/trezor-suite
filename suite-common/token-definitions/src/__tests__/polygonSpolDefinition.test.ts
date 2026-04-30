import { type TokenAddress } from '@suite-common/wallet-types';

import { selectIsSpecificCoinDefinitionKnown } from '../tokenDefinitionsSelectors';
import { DefinitionType } from '../tokenDefinitionsTypes';

// sPOL ERC-20 on Polygon PoS — pinned by ROADMAP/PROJECT/REQUIREMENTS for v1.
// The address is case-insensitive on EVM; lowercase here to match the convention
// used by token-definitions data (verified in existing fixtures).
const SPOL_ADDRESS = '0xd1cd49a08aef3af93457aec17c786c2b7f48ecd7' as TokenAddress;

describe('selectIsSpecificCoinDefinitionKnown for sPOL on Polygon (NET-04)', () => {
    // This test is forward-looking: it documents the contract that the Trezor
    // data-pipeline owner must satisfy by regenerating
    //   https://data.trezor.io/suite/definitions/{stable|develop}/polygon-pos.simple.coin.definitions.v1.json
    // to include the sPOL contract address. Suite has no in-repo override
    // mechanism (D-11), so this is the only NET-04 deliverable in this PR.
    it('returns true when the runtime bundle includes sPOL on pol', () => {
        const state = {
            tokenDefinitions: {
                pol: {
                    [DefinitionType.COIN]: {
                        error: false,
                        isLoading: false,
                        hide: [],
                        show: [],
                        data: [SPOL_ADDRESS],
                    },
                },
            },
        };

        expect(selectIsSpecificCoinDefinitionKnown(state, 'pol', SPOL_ADDRESS)).toBe(true);
    });

    // Negative control: proves the test exercises real selector logic and is
    // not a tautology against the SPOL_ADDRESS literal.
    it('returns false when the runtime bundle does not yet include sPOL', () => {
        const state = {
            tokenDefinitions: {
                pol: {
                    [DefinitionType.COIN]: {
                        error: false,
                        isLoading: false,
                        hide: [],
                        show: [],
                        data: [],
                    },
                },
            },
        };

        expect(selectIsSpecificCoinDefinitionKnown(state, 'pol', SPOL_ADDRESS)).toBe(false);
    });
});
