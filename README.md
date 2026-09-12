# World Bank Procurement Intelligence - Tenders & Debarment Monitor (Global Development Finance)

[![Built for Apify](https://img.shields.io/badge/Built%20for-Apify-00C2FF?style=flat-square&logo=apify&logoColor=white)](https://apify.com)
[![Pay-Per-Event pricing](https://img.shields.io/badge/Pay--Per--Event-from%20%240.001%2Fevent-3DDC84?style=flat-square)](#pricing-pay-per-event)
[![TypeScript](https://img.shields.io/badge/TypeScript-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=flat-square)](./LICENSE)

[![Run this Actor on Apify](https://img.shields.io/badge/%E2%96%B6%20Run%20on-Apify-FF9012?style=for-the-badge)](https://apify.com/stefano_seggio/actor-20-mdb-procurement-monitor)

## Executive Value Proposition

Checking the World Bank's procurement portal and its debarred-firms page by
hand means repeat manual visits, no change history between checks, and no
structured export to plug into a CRM, BI tool, or compliance workflow. This
actor replaces that manual routine: it polls the World Bank's public
Procurement Notices API and its "Other Sanctions" debarment sub-table on
whatever schedule you set, normalizes every record into one consistent
18-field schema, and — when delta mode is enabled — tells you exactly which
notices are new, have changed status, or were otherwise updated since your
last run, so you review only what actually moved rather than re-scanning the
whole list every time.

**Scope note:** this actor covers the **World Bank only**. The Asian
Development Bank (ADB) and Inter-American Development Bank (IDB/BID) were
both live-researched during development and are deliberately **out of
scope** for this version — ADB's procurement pages sit behind a
Cloudflare/WAF challenge on every path tested, and IDB's notices render
exclusively through an embedded Power BI report whose only structured data
route (a CKAN API at `data.iadb.org`) is explicitly disallowed in that
site's own `robots.txt`. Neither was force-scraped or bypassed; both are
honestly deferred. See **Reliability** below for how that finding was
verified.

## Use cases

1. **Bid-opportunity tracking for contractors and consultants.** Filter by
   country and notice type (e.g. `Invitation for Bids`,
   `Request for Expression of Interest`) to get a structured feed of live
   World Bank-financed tenders instead of checking the procurement portal
   page by page.
2. **Vendor debarment and compliance screening.** Pull the "Other Sanctions"
   sub-table — sanctioned-firm name, sanction type, and grounds — as a
   structured feed to screen counterparties or subcontractors before
   signing, without manually reading the World Bank's debarred-firms page.
3. **Development-finance market intelligence.** Track procurement method
   mix, country distribution, and notice-type volume over time (via
   `category_or_type`, `awarding_or_regulating_agency`, and
   `status_or_estado`) for market-sizing or business-development research
   into World Bank-financed project pipelines.

## Input

Example input (matches `.actor/input_schema.json`):

```json
{
    "sources": ["worldBankProcurementNotices", "worldBankDebarredFirms"],
    "maxItemsPerSource": 100,
    "onlyNew": false,
    "countryFilter": ["Kenya", "India"],
    "noticeTypeFilter": ["Invitation for Bids"],
    "dateRange": "30d"
}
```

| Field              | Type            | Default                                                          | Description                                                                                                                                                                                        |
| ------------------ | --------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sources`           | array (enum)    | `["worldBankProcurementNotices", "worldBankDebarredFirms"]`      | Which sub-source(s) to extract. `worldBankProcurementNotices` = the live Procurement Notices API; `worldBankDebarredFirms` = the "Other Sanctions" debarment sub-table. ADB/IDB are not selectable — see Scope note above. |
| `maxItemsPerSource` | integer          | `100`                                                              | Hard cap on records returned per selected source this run (1-5000). For procurement notices this bounds `rows`/`os` pagination; for debarred firms it's a no-op ceiling since that sub-table is a single small page. |
| `onlyNew`           | boolean          | `false`                                                            | Delta mode. When `true`, only procurement notices new or changed since the last run are returned (identical ones are skipped). Has no effect on Other Sanctions, which has no delta concept.       |
| `countryFilter`     | array of strings | none                                                               | Client-side filter on `project_ctry_name` (procurement notices only). The World Bank API documents no server-side country filter, so this is applied after each page is fetched.                  |
| `noticeTypeFilter`  | array of strings | none                                                               | Client-side filter on `notice_type` (procurement notices only), e.g. `Invitation for Bids`, `Request for Expression of Interest`, `Contract Award`.                                                |
| `dateRange`         | enum             | none                                                               | Restrict procurement notices to `24h` / `7d` / `30d` based on `noticedate`. Not applied to Other Sanctions records (no reliable per-record publish date in that sub-table).                        |

## Quick start

Run it straight from the [Apify CLI](https://docs.apify.com/cli/) (requires `npm install -g apify-cli` and `apify login` once):

```bash
apify call actor-20-mdb-procurement-monitor --input '{
    "sources": ["worldBankProcurementNotices", "worldBankDebarredFirms"],
    "maxItemsPerSource": 50,
    "onlyNew": false,
    "countryFilter": ["Kenya", "India"],
    "noticeTypeFilter": ["Invitation for Bids"],
    "dateRange": "30d"
}'
```

The run's normalized records land in its default dataset. Fetch them straight from the terminal:

```bash
apify datasets get-items <dataset-id> --clean
```

or pull the same data programmatically — see the Node.js and Python snippets in `examples/` for a scripted equivalent using `apify-client`.

## Output

Every record — from either sub-source — is normalized to the same 18-field
schema. Two real examples, one per sub-source:

**Procurement notice** (World Bank Procurement Notices API):

```json
{
    "record_id": "wb-procnotice-OP00467118",
    "event_type": "NEW_LISTING",
    "scraped_at": "2026-09-08T09:14:22.481Z",
    "is_new": true,
    "source_url": "https://search.worldbank.org/api/v2/procnotices?format=json&id=OP00467118",
    "recipient_or_defendant_name": null,
    "entity_identifier_native": "KE-MOTI-566726-CS-QCBS",
    "value_native": null,
    "value_currency": null,
    "value_usd_normalized": null,
    "effective_date_iso": "2026-10-06T00:00:00Z",
    "publish_date_iso": "2026-09-05T00:00:00.000Z",
    "category_or_type": "Request for Expression of Interest",
    "status_or_estado": "Published",
    "awarding_or_regulating_agency": "Ministry of Transport and Infrastructure",
    "jurisdiction": "WB",
    "source_document_url": "http://www.transport.go.ke",
    "reference_number": "KE-MOTI-566726-CS-QCBS"
}
```

**Debarment record** (World Bank "Other Sanctions" sub-table):

```json
{
    "record_id": "wb-sanction-oao-armada-ongoing",
    "event_type": "SANCTION",
    "scraped_at": "2026-09-08T09:14:23.107Z",
    "is_new": null,
    "source_url": "https://www.worldbank.org/en/projects-operations/procurement/debarred-firms",
    "recipient_or_defendant_name": "OAO Armada",
    "entity_identifier_native": "OAO Armada *12",
    "value_native": null,
    "value_currency": null,
    "value_usd_normalized": null,
    "effective_date_iso": null,
    "publish_date_iso": null,
    "category_or_type": "Letter of reprimand",
    "status_or_estado": "Ongoing",
    "awarding_or_regulating_agency": "World Bank",
    "jurisdiction": "WB",
    "source_document_url": "https://www.worldbank.org/content/dam/documents/sanctions/sanctions-board/2025/sep/Sanctions%20Board%20Decision%20No.%2065%20-%20Letter%20of%20Reprimand.pdf",
    "reference_number": "12"
}
```

Notes on nulls, both honest rather than parsing gaps: the Procurement
Notices API exposes no winner/bidder-name field and no monetary-value field
at all, so `recipient_or_defendant_name`, `value_native`, `value_currency`,
and `value_usd_normalized` are always `null` on procurement-notice records.
The Other Sanctions sub-table's "Date of Imposition of Sanction" column
mixes real dates with status words like `"Ongoing"` in the same cell; when
it isn't a cleanly parseable date, `effective_date_iso` is `null` and the
raw text is preserved verbatim in `status_or_estado` rather than guessed at.
`jurisdiction` is the plain string `"WB"` for every record — this actor
covers a supranational lender, not a national/subnational government.

## Reliability

- **Content-anchored extraction, not brittle selectors.** The Other
  Sanctions table is located by matching its header row against real header
  text (`"Name of Firm & Address"`, `"Date of Imposition of Sanction"`,
  `"Sanction Imposed"`, `"Grounds"`), not a CSS class the source page
  doesn't define.
- **Degrade-honestly on extraction failure.** If that header row can't be
  found, or is found but zero data rows parse out of it, the actor treats
  this as an extraction-integrity failure — never as "no sanctions
  currently exist." It pushes one `SNAPSHOT_NO_DIFF` fallback record
  pointing at the World Bank's own static "Notes on Debarred Firms and
  Individuals" PDF instead of silently reporting an empty result.
- **Real cross-run delta detection.** In delta mode, a dual content
  fingerprint (one hash over `notice_status`, one over other mutable
  fields) is persisted per procurement-notice ID in this actor's own
  key-value store between runs, producing `NEW_LISTING`, `STATUS_CHANGE`,
  `UPDATED`, or `SNAPSHOT_NO_DIFF` per notice. `is_new` is populated
  (`true`/`false`) on every procurement-notice record regardless of whether
  delta mode is on.
- **Calibrated retry logic.** HTTP fetches distinguish retryable statuses
  (429 / 5xx) from permanent client errors (other 4xx), apply exponential
  backoff with jitter, and honor a real `Retry-After` header when the
  server sends one, instead of retrying every non-OK response uniformly.
- **Schema-validated inputs.** The Procurement Notices API's JSON envelope
  is parsed against a Zod schema on every page fetch, so an unexpected
  shape from the source fails loudly instead of silently propagating bad
  data. Actor input is likewise validated against a Zod schema; if it's
  invalid, the run logs a warning and falls back to documented defaults
  rather than crashing.
- **No bypass of access controls, anywhere.** No CAPTCHA-solving, no
  fingerprint spoofing, no WAF/OAuth-gate bypass is implemented for any
  source, live or deferred — which is precisely why ADB and IDB are
  deferred rather than scraped through their respective gates.

## Pricing (Pay-Per-Event)

This actor uses Apify's Pay-Per-Event (PPE) pricing model, billed per
normalized record delivered — not per run, and not per platform compute
unit:

| Event | Title | Price | Fires on |
| --- | --- | --- | --- |
| `procurementNotices` | World Bank Procurement Notice | **$0.001 / event** | Each normalized record from the Procurement Notices sub-source |
| `debarredFirms` | World Bank Debarment/Sanction Record | **$0.003 / event** | Each normalized record from the Other Sanctions sub-source |

You pay only for the normalized records this actor actually delivers to
your dataset on each run — there is no separate per-run or per-source flat
fee on top of these two event rates, and no charge for a run that finds
nothing new when `onlyNew` is enabled.

## Support & Enterprise SLA

This is an independently developed and maintained actor, not a
vendor-backed enterprise product. Bugs, data-quality issues, or feature
requests are best filed through this actor's issue tracker on the Apify
Store page; the developer typically responds within about 48 hours. There
is no contractual enterprise SLA or guaranteed uptime commitment attached
to this actor — if your use case requires one, please reach out before
relying on it for a mission-critical workflow so expectations are clear
up front.

---

This Actor is part of **Delta Registry** — pay-per-event regulatory & compliance data infrastructure built and operated by Stefano Seggio. For professional inquiries or enterprise licensing, connect on [LinkedIn](https://www.linkedin.com/in/stefanoseggio-deltaregistry); for the rest of the fleet, see [github.com/stefanoseggio](https://github.com/stefanoseggio).
