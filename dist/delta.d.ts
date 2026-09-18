import type { RecordFingerprint } from './fingerprint.js';
/**
 * World Bank Procurement Notices' real event-type vocabulary. First-seen
 * keeps this source's existing name 'NEW_LISTING' (a genuinely new
 * procurement notice, unlike actor-19/22's SANCTION-style domains). No
 * CLOSED here: this endpoint IS real-paginated (see
 * sources/worldBankProcurementNotices.ts - server-side `os`/`rows`
 * pagination, and the fetch loop breaks once `maxItems` is reached), so a
 * fetch is not reliably a complete census the way OFAC's single-file SDN
 * export is - and there is no independently live-verified evidence this
 * endpoint ever removes a notice from its result set rather than just
 * updating its notice_status in place (e.g. to a "Closed"/"Awarded"-style
 * value, which IS captured here as a real STATUS_CHANGE). Adding a
 * CLOSED-by-absence check without that verification would risk exactly the
 * false-positive class of bug already found and fixed on this fleet's
 * entrerios-compras-monitor and salta-compras-monitor.
 */
export type ProcNoticeEventType = 'NEW_LISTING' | 'STATUS_CHANGE' | 'UPDATED' | 'SNAPSHOT_NO_DIFF';
export declare function classifyProcNotice(previous: RecordFingerprint | undefined, current: RecordFingerprint): ProcNoticeEventType;
//# sourceMappingURL=delta.d.ts.map