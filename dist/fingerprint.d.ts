import type { WorldBankProcNoticeRaw } from './schemas.js';
export interface RecordFingerprint {
    statusFingerprint: string;
    contentFingerprint: string;
}
/**
 * World Bank Procurement Notice fingerprint. `notice_status` is the real
 * status field this source provides (verified in schemas.ts's raw shape),
 * tracked separately so a status transition (e.g. a notice moving from
 * "Active" to "Closed") is distinguishable from an unrelated content edit.
 * `id` is deliberately excluded - it's the identity field already encoded
 * in record_id, and a fingerprint over an identity field can never usefully
 * change.
 */
export declare function procNoticeFingerprintOf(raw: WorldBankProcNoticeRaw): RecordFingerprint;
//# sourceMappingURL=fingerprint.d.ts.map