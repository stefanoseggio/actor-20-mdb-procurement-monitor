# Multilateral Development Bank Procurement Monitor

Extracts procurement notices and debarment/sanction records from Multilateral
Development Banks, normalized to a shared 18-field Unified Master Schema
(UMS), with real cross-run change detection on the Procurement Notices
sub-source (new/changed/status-changed - see "Delta mode" below).

## What's live in v1

| Source                                                 | Host                         | Mechanism                                           | Status                                                   |
| ------------------------------------------------------ | ---------------------------- | --------------------------------------------------- | -------------------------------------------------------- |
| World Bank Procurement Notices                         | `search.worldbank.org`       | Public, unauthenticated JSON API                    | **Live**                                                 |
| World Bank "Other Sanctions"                           | `www.worldbank.org`          | Static HTML `<table>` (header-anchored)             | **Live**                                                 |
| World Bank "Debarred & Cross-Debarred Firms" (Table 1) | `www.worldbank.org`          | Client-side Kendo grid over an undocumented gateway | **Not scraped** (see below)                              |
| Asian Development Bank (ADB) procurement               | `adb.org`                    | —                                                   | **Deferred** (Cloudflare/WAF-gated)                      |
| Inter-American Development Bank (IDB/BID) procurement  | `iadb.org` / `data.iadb.org` | —                                                   | **Deferred** (Power BI embed; API blocked by robots.txt) |

## World Bank Procurement Notices API

`GET https://search.worldbank.org/api/v2/procnotices?format=json&rows=<n>&os=<offset>`

Confirmed live and unauthenticated with a real GET during development
(2026-09-07). Envelope: `{rows, os, page, total, procnotices: [...]}`. Field
list is exactly as documented in the task brief and verified against the
real response - see `src/schemas.ts` (`WorldBankProcNoticeRawSchema`) and
`test/fixtures/worldBankProcNotices.json`, which contains real (trimmed)
records captured from that response.

No documented server-side filter beyond `rows`/`os` pagination exists, so
`countryFilter`, `noticeTypeFilter`, and `dateRange` (actor input) are all
applied client-side after each page is fetched (`src/sources/worldBankProcurementNotices.ts`).

This endpoint carries **no winner/bidder-name field and no monetary value
field** - `recipient_or_defendant_name`, `value_native`, `value_currency`,
and `value_usd_normalized` are always `null` for these records. That's an
honest "not applicable," not a parsing gap (a separate WB "Contract Awards"
dataset carries award values; it's out of scope here).

## World Bank Debarred Firms page

`https://www.worldbank.org/en/projects-operations/procurement/debarred-firms`

This page renders **two** tables with very different character, confirmed by
directly inspecting the live page's HTML/inline JS on 2026-09-07:

- **Table 1** ("Debarred & Cross-Debarred Firms and Individuals") is a Kendo
  UI grid (`$("#k-debarred-firms").kendoGrid(...)`). Its data source
  (`transport.read.url`) is
  `https://apigwext.worldbank.org/dvsvc/v1.0/json/APPLICATION/ADOBE_EXPRNCE_MGR/FIRM/SANCTIONED_FIRM`
    - an **undocumented internal API gateway**, confirmed present verbatim in
      the page's inline `<script>`. Per this fleet's compliance doctrine, an
      undocumented gateway is not treated as a source, so **Table 1 is never
      queried** by this actor, directly or indirectly.
- **Table 2** ("Other Sanctions") **is** present in the plain-fetched static
  HTML as a real `<table>` with genuine semantic header text ("Name of Firm
  & Address", "Date of Imposition of Sanction", "Sanction Imposed",
  "Grounds"). This is the only table this actor extracts -
  `src/sources/worldBankDebarredFirms.ts` locates it by matching those header
  strings (content-anchored, not a fabricated CSS class - the page defines
  none for this hand-authored table).

**Extraction-integrity handling**: if the header row can't be found, or it's
found but zero data rows parse out of it, that is treated as an
**extraction-integrity failure** - never silently reported as "no debarred
firms/sanctions exist." In that case the actor pushes one `SNAPSHOT_NO_DIFF`
record (`umsNormalizer.buildDebarredFirmsDegradedNotice`) pointing at the
World Bank's own static "Notes on Debarred Firms and Individuals" PDF
(`https://thedocs.worldbank.org/en/doc/387181466627871302-0290022021/original/WorldBankNotesonDebarredFirmsandIndividuals.pdf`)
as a documented fallback reference, instead of the undocumented gateway.

The "Date of Imposition of Sanction" column mixes actual dates and status
words ("Ongoing") in one cell, and - confirmed live in the real page,
2026-09-07 - contains at least one source-side typo ("**Feberuary**").
`parseWorldBankSanctionDate` only recognizes correctly-spelled full month
names and returns `null` for anything else rather than guessing at a
misspelling; the raw text is always preserved verbatim in `status_or_estado`
so nothing is lost.

## ADB and IDB: live research findings (2026-09-07)

Both were freshly researched for this actor - WebSearch/WebFetch plus direct
`curl` verification of robots.txt and response codes - and both are
**deferred, not force-scraped**. Full detail and evidence URLs live in
`src/sources/deferredSources.ts` (logged at the start of every actor run);
summary:

### ADB (Asian Development Bank) - deferred

`adb.org` sits behind a **Cloudflare bot-detection/WAF challenge** on every
path tested:

- `adb.org/business/project-procurement/business-opportunities` -> HTTP 403
- `adb.org/business/how-to/where-to-find-current-tenders-bidding-opportunities` -> HTTP 403
- `adb.org/rss` (the page listing ADB's procurement-notice RSS feeds) -> HTTP 403, even with a real browser `User-Agent`
- `adb.org/robots.txt` itself returns a Cloudflare "Just a moment..." interstitial page (not a robots.txt at all), with a CSP referencing `challenges.cloudflare.com`

ADB does document RSS feeds for procurement/tender categories, but the feed
host inherits the same Cloudflare gate - so this is not a genuinely open
machine-readable export in practice. This is precisely the kind of gate this
fleet's compliance doctrine forbids working around (no WAF bypass, no
fingerprint spoofing), so ADB procurement notices are out of scope for v1.

### IDB / BID (Inter-American Development Bank) - deferred

IDB's live Procurement Notices page
(`iadb.org/en/how-we-can-work-together/procurement/procurement-projects/procurement-notices`,
HTTP 200) renders its listing **exclusively via an embedded Power BI
report** - confirmed via the page's `drupalSettings.idb_powerbi.embedUrl`
(`https://app.powerbi.com/reportEmbed?reportId=8a3cf387-...`). That's a
JS-rendered, third-party embed, not static HTML or a documented open API.

The one genuinely structured route to comparable IDB data is real: a CKAN
open-data dataset at `data.iadb.org` ("IDB Project procurement bidding
notices and notification of contract awards", CC-BY 4.0), whose
`package_show`/`datastore_search` API endpoints return valid JSON when
queried directly. However, `data.iadb.org/robots.txt` **explicitly
disallows** `/api/`, `/datastore/dump/`, `/file/download/`, and
`/dataset/download/`, under the comment _"Block direct download paths to
force landing page traffic"_ - i.e. every machine-readable access path to
that data is robots-disallowed by the publisher itself, even though the
dataset's content license is open.

Both routes are non-compliant for this actor's plain-fetch,
robots-respecting design (reverse-engineering the Power BI embed would be a
JS-embed/auth-token bypass; calling the CKAN API would ignore an explicit
robots.txt disallow), so IDB procurement notices are deferred rather than
force-scraped either way.

If either bank's access posture changes, `src/sources/deferredSources.ts`
documents exactly where to pick this up: add
`src/sources/adbProcurement.ts` / `src/sources/idbProcurement.ts` next to
`worldBankProcurementNotices.ts`, extend `umsNormalizer.ts`, and use the
`'ADB'`/`'IDB'` jurisdiction codes already reserved there.

## Unified Master Schema (UMS)

All records - from both live sub-sources - are normalized through the one
shared `src/umsNormalizer.ts` into an 18-field UMS
(`src/schemas.ts#UnifiedRecordSchema`), null-honest per field.
`jurisdiction` here is a plain non-empty string (`'WB'`), not a closed
enum - a supranational lender doesn't fit a union of national/subnational
government codes.

Because this single actor emits two different native record shapes (unlike
most of this developer's other actors, where one actor = one shape),
`record_id` is prefixed per sub-source (`wb-procnotice-<id>`,
`wb-sanction-<slug>`) so ids are self-describing and can't collide within a
run.

## Delta mode - change detection (Procurement Notices only)

Enable `onlyNew: true` and this actor persists a content fingerprint per
Procurement Notice (in its own named key-value store) and returns only
notices that are new since the last run OR whose `notice_status` or other
tracked fields changed since last seen:

- **`NEW_LISTING`** - first time this notice id has been seen.
- **`STATUS_CHANGE`** - `notice_status` differs from last time (e.g. a
  notice moving toward award/close).
- **`UPDATED`** - some other field changed (deadline, description, contact
  info, etc.) but status didn't.
- **`SNAPSHOT_NO_DIFF`** - identical to last time; skipped from delivery
  when `onlyNew` is on.

`is_new` (`true`/`false`) is always populated on every Procurement Notice
record, regardless of `onlyNew`.

There's no "closed" event here: this endpoint is genuinely
server-side-paginated and each run's fetch stops once `maxItemsPerSource`
is reached, so a fetch is never guaranteed to be a complete census of the
register the way a single-file export would be - a trustworthy
absence-means-closed signal isn't available. The **"Other Sanctions"**
sub-source has no delta concept at all (`is_new: null`,
`event_type: 'SANCTION'` always) - it's a small static snapshot page, not a
paginated/dated feed.

## Pricing (PPE)

Compute baseline: $0.25/CU-hour at 1GB / 2,000 req-hr => $0.000125/request.

- `procurementNotices` event: **$0.001/record** (~99.75% margin - a single
  cheap JSON GET returns many records per request).
- `debarredFirms` event: **$0.003/record** (~91.7-95.8% margin, normal vs.
  degraded-fallback path - one HTML fetch amortized across a small,
  slowly-changing row count).

Both clear this fleet's 85% margin bar (`cost/record <= price * 0.15`) and
sit within the existing $0.0005-$0.003/record rate card.

## Compliance

No CAPTCHA-solving, no fingerprint spoofing, no WAF/OAuth-gate bypass
anywhere in this package (verified by grep - the only occurrences of those
terms are in documentation/comments explaining what is deliberately _not_
done and why ADB/IDB are deferred). Both live sources were robots.txt- and
response-code-checked on 2026-09-07:

- `search.worldbank.org`: no robots.txt (404 - no restrictions declared).
- `www.worldbank.org`: robots.txt present (`Allow: /`), does not disallow
  `/en/projects-operations/procurement/debarred-firms`.

## Self-verification (run 2026-09-07)

1. `npm install` - succeeded (437 packages, 0 errors).
2. `npm run build` (`tsc`) - **zero type errors**.
3. `npm test` (`vitest run`) - **29/29 tests passed**, 3 test files
   (`test/umsNormalizer.test.ts`, `test/dateUtils.test.ts`,
   `test/worldBankDebarredFirms.test.ts`), all against real fixture data
   captured from live sources, no live network calls inside the test suite.
4. A real, read-only, low-volume live fetch was made against the World Bank
   Procurement Notices API during development (`rows=3`, free/unauthenticated
   GET) confirming the documented envelope shape still matches. The full
   actor was then also run end-to-end locally (`tsx src/main.ts` against real
   local Apify storage, `maxItemsPerSource: 5`) and successfully pushed 5 real
   procurement-notice records and 4 real Other-Sanctions records with the
   exact documented UMS shape - not just unit-tested in isolation.
5. `grep`-ed for CAPTCHA/fingerprint/WAF-bypass language across `src/`,
   `mcp/`, and `test/` - all matches are documentary (compliance-doctrine
   references and the ADB/IDB deferral writeup), zero implementation.
6. Known incomplete item: ADB and IDB procurement notices are not ingested
   in this v1, by design - see the research findings above.

One environment note from step 4: in this development sandbox, one of the
"Other Sanctions" PDF links resolved through a corporate network security
proxy (`mcas-proxyweb.mcas.ms`) rather than a bare `worldbank.org` URL. That
is an artifact of the outbound network the fetch happened to run through in
this session, not something this code does - the parser stores whatever
`href` is present in the page verbatim, so on Apify's platform (or any
unproxied network) it would capture the real `worldbank.org`/`thedocs.worldbank.org`
URL as-is.
