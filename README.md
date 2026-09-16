# World Bank Procurement Intelligence - Tenders & Debarment Monitor (Global Development Finance)

[![Built for Apify](https://img.shields.io/badge/Built%20for-Apify-00C2FF?style=flat-square&logo=apify&logoColor=white)](https://apify.com)
[![Pay-Per-Event pricing](https://img.shields.io/badge/Pay--Per--Event-from%20%240.001%2Fevent-3DDC84?style=flat-square)](#cost--byok-disclosure)
[![TypeScript](https://img.shields.io/badge/TypeScript-blue?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg?style=flat-square)](./LICENSE)

[![Run this Actor on Apify](https://img.shields.io/badge/%E2%96%B6%20Run%20on-Apify-FF9012?style=for-the-badge)](https://apify.com/stefano_seggio/actor-20-mdb-procurement-monitor)

> This Actor monitors the World Bank's Procurement Notices API and its "Other Sanctions" debarred-firms table (Global development finance — World Bank only; ADB / IDB explicitly excluded, see Scope note below), and runs whenever you trigger it or schedule it on your own Apify Scheduler — there is no fixed operator-side cadence.

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

## Cost & BYOK Disclosure

### Pricing (Pay-Per-Event)

This actor uses Apify's Pay-Per-Event (PPE) pricing model, billed per
normalized record delivered — not per run, and not per platform compute
unit:

| Event | Title | What triggers it | Price |
| --- | --- | --- | --- |
| `procurementNotices` | World Bank Procurement Notice | Each normalized record delivered from the Procurement Notices sub-source | **$0.001 / event** |
| `debarredFirms` | World Bank Debarment/Sanction Record | Each normalized record delivered from the Other Sanctions sub-source (including the rare degraded-extraction fallback notice) | **$0.003 / event** |

You pay only for the normalized records this actor actually delivers to
your dataset on each run — there is no separate per-run or per-source flat
fee on top of these two event rates.

### How unchanged-record suppression actually works

`procurementNotices` records get two SHA-1 fingerprints, computed by [`src/fingerprint.ts`](./src/fingerprint.ts): a `statusFingerprint` over `notice_status` alone, and a `contentFingerprint` over the notice's other mutable fields. Comparing these against the previous run's persisted fingerprint (in this actor's own key-value store) classifies each notice as `NEW_LISTING`, `STATUS_CHANGE`, `UPDATED`, or `SNAPSHOT_NO_DIFF`.

- **`onlyNew: true`:** a `SNAPSHOT_NO_DIFF` procurement notice is skipped before it is ever pushed to the dataset — no `procurementNotices` event fires, so it is genuinely **$0.00**, not billed, and not a refund applied after the fact.
- **`onlyNew: false` (the default):** every notice fetched this run is pushed and billed, including unchanged ones marked `SNAPSHOT_NO_DIFF`.

This delta mechanism applies **only** to `worldBankProcurementNotices`. The `worldBankDebarredFirms` sub-source has no delta concept at all — it is a small static page, not a dated/paginated feed — so every debarred-firm record delivered is billed on every run regardless of `onlyNew`, including the rare degraded-extraction fallback record (see Reliability below).

### BYOK (Bring Your Own Key)

This actor requires no third-party API key. Both the World Bank Procurement Notices API and the "Other Sanctions" page are open, unauthenticated public sources.

## Quickstart

The Actor's real slug is `stefano_seggio/actor-20-mdb-procurement-monitor` (Actor ID `dyzTtWjfyYd7bvUZY`, works interchangeably in all three clients below).

### cURL (instant, synchronous)

Runs synchronously and returns the resulting dataset items directly in the response - no polling needed. Get your token from [console.apify.com/settings/integrations](https://console.apify.com/settings/integrations).

```bash
curl -X POST "https://api.apify.com/v2/acts/dyzTtWjfyYd7bvUZY/run-sync-get-dataset-items?token=<YOUR_API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
  "maxItemsPerSource": 50,
  "onlyNew": true
}'
```

### Python (`apify-client`)

```python
import os
from apify_client import ApifyClient

client = ApifyClient(os.environ["APIFY_TOKEN"])

run_input = {
    "sources": ["worldBankProcurementNotices", "worldBankDebarredFirms"],
    "maxItemsPerSource": 50,
    "onlyNew": False,
    "countryFilter": ["Kenya", "India"],
    "noticeTypeFilter": ["Invitation for Bids"],
    "dateRange": "30d",
}

run = client.actor("stefano_seggio/actor-20-mdb-procurement-monitor").call(run_input=run_input)
items = client.dataset(run["defaultDatasetId"]).list_items().items

for item in items:
    category = item.get("category_or_type") or "n/a"
    print(f"- [{item.get('event_type')}] {item.get('record_id')}: {category}")
```

A full runnable copy lives at [`examples/call_actor.py`](./examples/call_actor.py).

### Node.js (`apify-client`)

```javascript
const { ApifyClient } = require('apify-client');

const client = new ApifyClient({ token: process.env.APIFY_TOKEN });

async function main() {
    const run = await client.actor('stefano_seggio/actor-20-mdb-procurement-monitor').call({
        sources: ['worldBankProcurementNotices', 'worldBankDebarredFirms'],
        maxItemsPerSource: 50,
        onlyNew: false,
        countryFilter: ['Kenya', 'India'],
        noticeTypeFilter: ['Invitation for Bids'],
        dateRange: '30d',
    });

    const { items } = await client.dataset(run.defaultDatasetId).listItems();
    for (const item of items) {
        console.log(`- [${item.event_type}] ${item.record_id}: ${item.category_or_type ?? 'n/a'}`);
    }
}

main().catch((err) => {
    console.error('Actor call failed:', err);
    process.exit(1);
});
```

A full runnable copy lives at [`examples/call-actor.js`](./examples/call-actor.js).

### Apify CLI

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

The run's normalized records land in its default dataset. Fetch them straight from the terminal with `apify datasets get-items <dataset-id> --clean`.

## Input & Output Schema

### Input

| Field              | Type            | Default                                                          | Description                                                                                                                                                                                        |
| ------------------ | --------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sources`           | array (enum)    | `["worldBankProcurementNotices", "worldBankDebarredFirms"]`      | Which sub-source(s) to extract. `worldBankProcurementNotices` = the live Procurement Notices API; `worldBankDebarredFirms` = the "Other Sanctions" debarment sub-table. ADB/IDB are not selectable — see Scope note above. |
| `maxItemsPerSource` | integer          | `100`                                                              | Hard cap on records returned per selected source this run (1-5000). For procurement notices this bounds `rows`/`os` pagination; for debarred firms it's a no-op ceiling since that sub-table is a single small page. |
| `onlyNew`           | boolean          | `false`                                                            | Delta mode. When `true`, only procurement notices new or changed since the last run are returned (identical ones are skipped). Has no effect on Other Sanctions, which has no delta concept.       |
| `countryFilter`     | array of strings | none                                                               | Client-side filter on `project_ctry_name` (procurement notices only). The World Bank API documents no server-side country filter, so this is applied after each page is fetched.                  |
| `noticeTypeFilter`  | array of strings | none                                                               | Client-side filter on `notice_type` (procurement notices only), e.g. `Invitation for Bids`, `Request for Expression of Interest`, `Contract Award`.                                                |
| `dateRange`         | enum             | none                                                               | Restrict procurement notices to `24h` / `7d` / `30d` based on `noticedate`. Not applied to Other Sanctions records (no reliable per-record publish date in that sub-table).                        |

Full machine-readable definition: [`.actor/input_schema.json`](./.actor/input_schema.json).

### Sample Extracted Dataset (JSON)

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

### Output field reference

| Field | Type | Description |
|---|---|---|
| `record_id` | string | `wb-procnotice-<id>` or `wb-sanction-<slug>`, stable across runs. |
| `event_type` | string | `NEW_LISTING` / `STATUS_CHANGE` / `UPDATED` / `SNAPSHOT_NO_DIFF` for procurement notices; always `SANCTION` for debarment records (no delta concept on that sub-source). |
| `scraped_at` | string | ISO-8601 timestamp of this extraction. |
| `is_new` | boolean \| null | `true`/`false` on every procurement-notice record regardless of `onlyNew`; always `null` on debarment records (no cross-run identity tracked for that sub-source). |
| `source_url` | string | The API endpoint (procurement notices) or the debarred-firms page (debarment records) this record came from. |
| `recipient_or_defendant_name` | string \| null | The debarred firm's name; always `null` for procurement notices — that API exposes no winner/bidder-name field. |
| `entity_identifier_native` | string \| null | The notice's bid reference number, or the firm's native debarment-table identifier. |
| `value_native` / `value_currency` / `value_usd_normalized` | null | Always `null` on both sub-sources — neither World Bank source exposes a monetary-value field. |
| `effective_date_iso` | string \| null | The notice's submission deadline; `null` on debarment records when the "Date of Imposition" cell isn't a cleanly parseable date (see note below). |
| `publish_date_iso` | string \| null | The notice's publish date; always `null` for debarment records (no reliable per-record publish date in that sub-table). |
| `category_or_type` | string \| null | The notice type (e.g. `Request for Expression of Interest`) or the sanction type (e.g. `Letter of reprimand`). |
| `status_or_estado` | string \| null | The notice's status, or the debarment's status/raw imposition-date text when it wasn't a parseable date. |
| `awarding_or_regulating_agency` | string \| null | The financing ministry/agency, or `"World Bank"` for debarment records. |
| `jurisdiction` | string | Always the literal string `"WB"` — this actor covers a supranational lender, not a national/subnational government. |
| `source_document_url` | string \| null | The financing agency's own site, or the linked sanctions-board decision PDF. |
| `reference_number` | string \| null | The bid reference number, or the debarment case number. |

Notes on nulls, both honest rather than parsing gaps: the Procurement
Notices API exposes no winner/bidder-name field and no monetary-value field
at all, so `recipient_or_defendant_name`, `value_native`, `value_currency`,
and `value_usd_normalized` are always `null` on procurement-notice records.
The Other Sanctions sub-table's "Date of Imposition of Sanction" column
mixes real dates with status words like `"Ongoing"` in the same cell; when
it isn't a cleanly parseable date, `effective_date_iso` is `null` and the
raw text is preserved verbatim in `status_or_estado` rather than guessed at.

Full machine-readable definition: [`.actor/dataset_schema.json`](./.actor/dataset_schema.json).

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
- **Real cross-run delta detection.** In delta mode, a dual SHA-1 content
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

## Contributing & Local Setup

This repository ships the Actor's real, buildable TypeScript source (`src/`, `package.json`, `test/`) - local development against real logic is fully possible here:

```bash
git clone https://github.com/stefanoseggio/actor-20-mdb-procurement-monitor.git
cd actor-20-mdb-procurement-monitor
npm install
apify login              # once per machine
apify run                 # full local Actor run via the Apify CLI
```

No third-party credentials are required to run this Actor locally — both World Bank sources are open and unauthenticated.

Bugs, data-quality issues, or a proposed new field/source (including a future ADB or IDB integration, should either drop its current access gate) are welcome via GitHub issues/PRs on this repository, or through the Apify Store's Issues tab on the [live Actor page](https://apify.com/stefano_seggio/actor-20-mdb-procurement-monitor) for non-code questions.

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
