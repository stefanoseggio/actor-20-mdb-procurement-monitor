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
export const DEFERRED_SOURCES = [
    {
        bank: 'Asian Development Bank (ADB)',
        reservedJurisdictionCode: 'ADB',
        status: 'deferred',
        checkedAt: '2026-09-07',
        reason: "adb.org sits behind a Cloudflare bot-detection/WAF challenge on every path tested, including its own robots.txt. This is exactly the kind of gate this fleet's compliance doctrine forbids working around (no WAF bypass, no fingerprint spoofing) - so ADB procurement notices are out of scope for v1, not force-scraped.",
        evidence: [
            'https://www.adb.org/business/project-procurement/business-opportunities -> HTTP 403 (plain fetch and WebFetch)',
            'https://www.adb.org/business/how-to/where-to-find-current-tenders-bidding-opportunities -> HTTP 403',
            'https://www.adb.org/rss -> HTTP 403 (even with a real browser User-Agent header)',
            "https://www.adb.org/robots.txt -> returns a Cloudflare 'Just a moment...' interstitial HTML page (title 'Just a moment...', CSP referencing challenges.cloudflare.com), not a robots.txt - i.e. even the robots file itself is behind the JS challenge.",
            'ADB does document RSS feeds for procurement/tender categories at adb.org/rss (per search results) - but the feed host inherits the same Cloudflare gate, so this is not a genuinely open machine-readable export in practice.',
        ],
    },
    {
        bank: 'Inter-American Development Bank (IDB / BID)',
        reservedJurisdictionCode: 'IDB',
        status: 'deferred',
        checkedAt: '2026-09-07',
        reason: "IDB's own live Procurement Notices page renders its listing exclusively via an embedded Power BI report (JS-rendered, not a plain-fetch HTML table or documented open API); the one genuinely structured route to comparable data - the CKAN open-data API at data.iadb.org - is real and live but that host's own robots.txt explicitly disallows every programmatic access path to it. Both routes are non-compliant for this actor's plain-fetch, robots-respecting design, so IDB procurement notices are deferred, not force-scraped via an embed reverse-engineer or a robots-disallowed API.",
        evidence: [
            'https://www.iadb.org/en/how-we-can-work-together/procurement/procurement-projects/procurement-notices -> HTTP 200, but the notices listing is an embedded Power BI report (drupalSettings.idb_powerbi.embedUrl = https://app.powerbi.com/reportEmbed?reportId=8a3cf387-d650-401a-8d54-4b3efa166314&groupId=...), not static HTML or a documented REST/JSON API.',
            'https://data.iadb.org/dataset/project-procurement-bidding-notices-and-notification-of-contract-awards -> a real CKAN dataset ("IDB Project procurement bidding notices and notification of contract awards", CC-BY 4.0) whose package_show/datastore_search API endpoints return valid JSON when queried directly.',
            'https://data.iadb.org/robots.txt -> explicitly "Disallow: /api/", "Disallow: /datastore/dump/", "Disallow: /file/download/", "Disallow: /dataset/download/", under the comment "Block direct download paths to force landing page traffic" - i.e. every machine-readable access path to that CKAN data is robots-disallowed by the publisher, even though the dataset itself is openly licensed.',
        ],
    },
];
//# sourceMappingURL=deferredSources.js.map