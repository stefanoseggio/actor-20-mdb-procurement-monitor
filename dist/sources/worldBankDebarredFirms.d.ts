import type { WorldBankOtherSanctionRaw } from '../schemas.js';
export declare const WORLD_BANK_DEBARRED_FIRMS_URL = "https://www.worldbank.org/en/projects-operations/procurement/debarred-firms";
export declare const NOTES_ON_DEBARRED_FIRMS_FALLBACK_URL = "https://thedocs.worldbank.org/en/doc/387181466627871302-0290022021/original/WorldBankNotesonDebarredFirmsandIndividuals.pdf";
export interface DebarredFirmsExtractionResult {
    records: WorldBankOtherSanctionRaw[];
    degraded: boolean;
    degradedReason: string | null;
}
/**
 * Pure parser - no network I/O - so it can be exercised in tests against a
 * fixture without a live fetch, and reused directly by
 * fetchWorldBankOtherSanctions below.
 */
export declare function parseOtherSanctionsHtml(html: string): DebarredFirmsExtractionResult;
export declare function fetchWorldBankOtherSanctions(): Promise<DebarredFirmsExtractionResult>;
//# sourceMappingURL=worldBankDebarredFirms.d.ts.map