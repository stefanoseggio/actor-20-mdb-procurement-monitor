import type { RecordFingerprint } from './fingerprint.js';
export interface RecordEntry extends RecordFingerprint {
    lastSeenAt: string;
}
export interface DeltaState {
    /** source -> id -> entry. v2 shape: a per-record fingerprint pair, not a flat seen-id array - this is what makes STATUS_CHANGE/UPDATED classification possible, not just is_new. */
    entries: Record<string, Record<string, RecordEntry>>;
    lastRunAt: Record<string, string>;
}
export declare function createEmptyState(): DeltaState;
export declare function loadState(): Promise<DeltaState>;
/**
 * Persists an entry for every id actually FETCHED this run for `source`
 * (only World Bank Procurement Notices tracks state at all - Other
 * Sanctions has no delta concept, see umsNormalizer.ts). Merged with prior
 * state (never a full replace) - this source's own fetch is real-paginated
 * and maxItems-capped, so "fetched this run" is never guaranteed to be a
 * complete census (see delta.ts's CLOSED reasoning); an id not re-fetched
 * this run must not be forgotten just because this run's maxItems/pagination
 * didn't reach it again.
 */
export declare function saveSourceState(state: DeltaState, source: string, entriesSeenThisRun: Record<string, RecordEntry>, runAt: string): Promise<DeltaState>;
//# sourceMappingURL=state.d.ts.map