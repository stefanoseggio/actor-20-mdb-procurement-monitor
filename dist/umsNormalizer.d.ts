/**
 * Shared UMS normalizer. Every source in this actor (currently the two
 * World Bank sub-sources; ADB/IDB reserved, see sources/deferredSources.ts)
 * funnels through this one module so all output rows share exactly the same
 * 18-field shape and the same record_id / jurisdiction / event_type
 * conventions - there is no per-source copy of this mapping logic.
 */
import type { ProcNoticeEventType } from './delta.js';
import type { UnifiedRecord, WorldBankOtherSanctionRaw, WorldBankProcNoticeRaw } from './schemas.js';
export declare const WORLD_BANK_JURISDICTION = "WB";
export declare function normalizeWorldBankProcurementNotice(raw: WorldBankProcNoticeRaw, scrapedAt: string, isNew: boolean | null, eventType?: ProcNoticeEventType): UnifiedRecord;
export declare function normalizeWorldBankOtherSanction(raw: WorldBankOtherSanctionRaw, scrapedAt: string): UnifiedRecord;
/**
 * Emitted instead of (never in addition to a false "zero sanctions") normal
 * Other-Sanctions records when parseOtherSanctionsHtml reports a zero-row /
 * missing-table extraction-integrity failure. Points the consumer at the
 * World Bank's own static "Notes on Debarred Firms" PDF as a documented
 * fallback reference, per this actor's degrade-honestly design (see
 * sources/worldBankDebarredFirms.ts header comment).
 */
export declare function buildDebarredFirmsDegradedNotice(scrapedAt: string, degradedReason: string): UnifiedRecord;
//# sourceMappingURL=umsNormalizer.d.ts.map