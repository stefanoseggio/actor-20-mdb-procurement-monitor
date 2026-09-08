/**
 * Live research findings for the two Multilateral Development Banks this
 * actor does NOT ingest in v1 - Asian Development Bank (ADB) and
 * Inter-American Development Bank (IDB / BID). Both were freshly researched
 * (WebSearch/WebFetch + direct curl verification) on 2026-09-07, specifically
 * for this actor. Neither is force-scraped: per this fleet's binding
 * compliance doctrine ("no CAPTCHA-solving, no fingerprint spoofing, no
 * WAF/OAuth-gate bypass... only genuinely open, ToS-compliant public
 * sources"), both are documented here and in README.md as DEFERRED rather
 * than silently omitted or worked around.
 *
 * This module is intentionally inert - a data/documentation artifact only
 * (logged once at actor startup by main.ts) - not a source implementation.
 * If either bank's access posture changes, add
 * src/sources/adbProcurement.ts / src/sources/idbProcurement.ts alongside
 * worldBankProcurementNotices.ts and extend umsNormalizer.ts; the
 * 'ADB' / 'IDB' jurisdiction codes are reserved below for that purpose.
 */
export interface DeferredSourceFinding {
    bank: string;
    reservedJurisdictionCode: 'ADB' | 'IDB';
    status: 'deferred';
    checkedAt: string;
    reason: string;
    evidence: string[];
}
export declare const DEFERRED_SOURCES: DeferredSourceFinding[];
//# sourceMappingURL=deferredSources.d.ts.map