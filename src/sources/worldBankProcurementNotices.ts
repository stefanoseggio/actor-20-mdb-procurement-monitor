import { fetchJsonWithRetry } from '../http.js';
import { type WorldBankProcNoticeRaw, WorldBankProcNoticesEnvelopeSchema } from '../schemas.js';

// Confirmed live, unauthenticated, no proxy needed - verified with a real GET
// during development, 2026-09-07: response envelope is exactly
// {rows, os, page, total, procnotices: [...]}, matching what's documented in
// README.md. No documented server-side filter parameters exist beyond
// rows/os pagination, so country/notice-type/date filtering below is applied
// client-side after fetching each page (also documented in .actor/input_schema.json).
export const WORLD_BANK_PROCNOTICES_URL = 'https://search.worldbank.org/api/v2/procnotices';

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;
// Safety valve against a runaway loop if `total` is ever malformed/missing -
// at MAX_PAGE_SIZE this is 40,000 fetched records, far above any realistic
// maxItemsPerSource input.
const HARD_PAGE_FETCH_CAP = 200;

export interface FetchWorldBankProcurementNoticesOptions {
    maxItems: number;
    pageSize?: number;
    countryFilter?: string[];
    noticeTypeFilter?: string[];
}

export async function fetchWorldBankProcurementNotices(
    options: FetchWorldBankProcurementNoticesOptions,
): Promise<WorldBankProcNoticeRaw[]> {
    const pageSize = Math.min(Math.max(options.pageSize ?? DEFAULT_PAGE_SIZE, 1), MAX_PAGE_SIZE);
    const countryFilter = options.countryFilter?.length ? new Set(options.countryFilter) : null;
    const noticeTypeFilter = options.noticeTypeFilter?.length ? new Set(options.noticeTypeFilter) : null;

    const results: WorldBankProcNoticeRaw[] = [];
    let os = 0;
    let total = Number.POSITIVE_INFINITY;
    let pagesFetched = 0;

    while (results.length < options.maxItems && os < total && pagesFetched < HARD_PAGE_FETCH_CAP) {
        const url = `${WORLD_BANK_PROCNOTICES_URL}?format=json&rows=${pageSize}&os=${os}`;
        const json = await fetchJsonWithRetry<unknown>(url);
        const envelope = WorldBankProcNoticesEnvelopeSchema.parse(json);
        total = Number(envelope.total);
        pagesFetched += 1;

        const batch = envelope.procnotices;
        if (batch.length === 0) break;

        for (const raw of batch) {
            if (countryFilter && !countryFilter.has(raw.project_ctry_name ?? '')) continue;
            if (noticeTypeFilter && !noticeTypeFilter.has(raw.notice_type ?? '')) continue;
            results.push(raw);
            if (results.length >= options.maxItems) break;
        }

        os += batch.length;
    }

    return results;
}
