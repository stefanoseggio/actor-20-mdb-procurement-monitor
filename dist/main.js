import { Actor, log } from 'apify';
import { isWithinDateRange, parseWorldBankNoticeDate } from './dateUtils.js';
import { classifyProcNotice } from './delta.js';
import { procNoticeFingerprintOf } from './fingerprint.js';
import { ActorInputSchema } from './schemas.js';
import { DEFERRED_SOURCES } from './sources/deferredSources.js';
import { fetchWorldBankOtherSanctions } from './sources/worldBankDebarredFirms.js';
import { fetchWorldBankProcurementNotices } from './sources/worldBankProcurementNotices.js';
import { loadState, saveSourceState } from './state.js';
import { buildDebarredFirmsDegradedNotice, normalizeWorldBankOtherSanction, normalizeWorldBankProcurementNotice, } from './umsNormalizer.js';
// PPE event names, priced per the fleet's real compute model: $0.25/CU-hour
// at 1GB / 2,000 req-hr => $0.000125/request. procurementNotices is a single
// cheap JSON GET per page (many records/request) => priced well under cost
// at $0.001/record (~99.75% margin against the $0.0005-$0.003/record fleet
// rate card floor). debarredFirms is one HTML fetch amortized across a small
// row count => $0.003/record (~91.7-95.8% margin depending on whether the
// normal or degraded-fallback path is taken). Both clear this fleet's 85%
// margin bar (cost/record <= price * 0.15).
const PROCUREMENT_NOTICE_EVENT_NAME = 'procurementNotices';
const DEBARRED_FIRM_EVENT_NAME = 'debarredFirms';
await Actor.init();
await run();
await Actor.exit();
async function pushRecord(record, eventName) {
    await Actor.pushData(record);
    const { eventChargeLimitReached } = await Actor.charge({ eventName, count: 1 });
    return eventChargeLimitReached;
}
async function run() {
    const rawInput = (await Actor.getInput()) ?? {};
    const parsedInput = ActorInputSchema.safeParse(rawInput);
    if (!parsedInput.success) {
        log.warning(`Input validation failed, falling back to defaults: ${parsedInput.error.message}`);
    }
    const input = parsedInput.success ? parsedInput.data : ActorInputSchema.parse({});
    const now = new Date();
    const scrapedAt = now.toISOString();
    // Honest, logged-every-run acknowledgement of what this actor does NOT
    // cover and why - see src/sources/deferredSources.ts for the full
    // live-research writeup (evidence URLs, dates, robots.txt/WAF findings).
    for (const deferred of DEFERRED_SOURCES) {
        log.info(`Deferred source: ${deferred.bank} (checked ${deferred.checkedAt}) - ${deferred.reason}`);
    }
    let state = await loadState();
    let stopped = false;
    try {
        if (!stopped && input.sources.includes('worldBankProcurementNotices')) {
            const priorEntries = state.entries.worldBankProcurementNotices ?? {};
            const rawNotices = await fetchWorldBankProcurementNotices({
                maxItems: input.maxItemsPerSource,
                countryFilter: input.countryFilter,
                noticeTypeFilter: input.noticeTypeFilter,
            });
            log.info(`World Bank Procurement Notices: fetched ${rawNotices.length} record(s).`);
            const entriesThisRun = {};
            for (const raw of rawNotices) {
                const fingerprint = procNoticeFingerprintOf(raw);
                const previous = priorEntries[raw.id];
                const eventType = classifyProcNotice(previous, fingerprint);
                entriesThisRun[raw.id] = { ...fingerprint, lastSeenAt: scrapedAt };
                if (input.dateRange) {
                    const noticeDate = parseWorldBankNoticeDate(raw.noticedate);
                    if (!isWithinDateRange(noticeDate, input.dateRange, now))
                        continue;
                }
                // onlyNew now means "new or changed since last run" (delivers
                // STATUS_CHANGE/UPDATED too), not just "never seen before" -
                // a disclosed behavior upgrade, see CHANGELOG.md, matching
                // the same change made the same day to actor-22 and
                // actor-19 in this fleet.
                if (input.onlyNew && eventType === 'SNAPSHOT_NO_DIFF')
                    continue;
                const record = normalizeWorldBankProcurementNotice(raw, scrapedAt, !previous, eventType);
                stopped = await pushRecord(record, PROCUREMENT_NOTICE_EVENT_NAME);
                if (stopped) {
                    log.info('Charge limit reached - stopping.');
                    break;
                }
            }
            state = await saveSourceState(state, 'worldBankProcurementNotices', entriesThisRun, scrapedAt);
        }
        if (!stopped && input.sources.includes('worldBankDebarredFirms')) {
            const extraction = await fetchWorldBankOtherSanctions();
            if (extraction.degraded) {
                log.error(`World Bank Other Sanctions extraction degraded: ${extraction.degradedReason}`);
                const notice = buildDebarredFirmsDegradedNotice(scrapedAt, extraction.degradedReason ?? 'unknown extraction failure');
                stopped = await pushRecord(notice, DEBARRED_FIRM_EVENT_NAME);
            }
            else {
                log.info(`World Bank Other Sanctions: fetched ${extraction.records.length} record(s).`);
                const limited = extraction.records.slice(0, input.maxItemsPerSource);
                for (const raw of limited) {
                    const record = normalizeWorldBankOtherSanction(raw, scrapedAt);
                    stopped = await pushRecord(record, DEBARRED_FIRM_EVENT_NAME);
                    if (stopped) {
                        log.info('Charge limit reached - stopping.');
                        break;
                    }
                }
            }
        }
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error(`Extraction failed: ${message}`);
        await Actor.pushData({ error: message, scraped_at: scrapedAt });
        return;
    }
    log.info('Run complete.');
}
//# sourceMappingURL=main.js.map