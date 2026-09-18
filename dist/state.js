import { Actor } from 'apify';
// A NAMED key-value store (not Actor.getValue()/setValue(), which resolve
// to the store "associated with the current Actor run" per the Apify SDK
// docs - isolated per run, never shared across separate runs, the exact bug
// found and fixed on this fleet's primer-actor) persists across scheduled
// runs. Keyed per source name since the two sub-sources' record_id spaces
// are independent.
const STATE_STORE_NAME = 'actor-20-mdb-procurement-monitor-delta-state';
const MAX_ENTRIES_PER_SOURCE = 5000;
// v1 of this actor stored { seenIds: Record<string, string[]>, lastRunAt }.
// isValidState() treats that shape (and anything else unexpected) as absent
// rather than attempting a migration - an existing scheduled task's next
// run simply re-baselines against the richer v2 shape.
function isValidState(value) {
    if (!value || typeof value !== 'object')
        return false;
    const candidate = value;
    if (typeof candidate.entries !== 'object' || candidate.entries === null)
        return false;
    if (typeof candidate.lastRunAt !== 'object' || candidate.lastRunAt === null)
        return false;
    return true;
}
export function createEmptyState() {
    return { entries: {}, lastRunAt: {} };
}
export async function loadState() {
    const store = await Actor.openKeyValueStore(STATE_STORE_NAME);
    const state = await store.getValue('state');
    return isValidState(state) ? state : createEmptyState();
}
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
export async function saveSourceState(state, source, entriesSeenThisRun, runAt) {
    const previous = state.entries[source] ?? {};
    const merged = { ...previous, ...entriesSeenThisRun };
    let capped = merged;
    const keys = Object.keys(merged);
    if (keys.length > MAX_ENTRIES_PER_SOURCE) {
        const keptKeys = keys.sort((a, b) => merged[b].lastSeenAt.localeCompare(merged[a].lastSeenAt)).slice(0, MAX_ENTRIES_PER_SOURCE);
        capped = Object.fromEntries(keptKeys.map((k) => [k, merged[k]]));
    }
    const next = {
        entries: { ...state.entries, [source]: capped },
        lastRunAt: { ...state.lastRunAt, [source]: runAt },
    };
    const store = await Actor.openKeyValueStore(STATE_STORE_NAME);
    await store.setValue('state', next);
    return next;
}
//# sourceMappingURL=state.js.map