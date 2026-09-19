# actor-20-mdb-procurement-monitor - AI agent notes

Multilateral Development Bank Procurement Monitor. Two World Bank sub-sources normalized to one 18-field UMS: **Procurement Notices** (`search.worldbank.org/api/v2/procnotices`, real server-side paginated JSON, unauthenticated) and **"Other Sanctions"** debarred-firms table (`worldbank.org/.../debarred-firms`, static HTML, Table 2). ADB (Cloudflare-gated, confirmed live) and IDB (CKAN API real but `robots.txt`-blocked on every programmatic path) were live-researched and honestly deferred - see `src/sources/deferredSources.ts` and README.md, not silently omitted.

## HTTP transport: `impit`, not the native `fetch`

`src/http.ts`'s `fetchWithRetry` calls a module-level `Impit` instance
(`new Impit({ browser: 'chrome' })`, from the `impit` package) instead of
the global `fetch` - added 2026-09-19 as a fleet-wide TLS-fingerprint-
hardening pilot (proactive hardening, not a bug fix - Node's `fetch` isn't
deprecated). Two things to know if you touch this file again:
- **`fetchWithRetry`'s return type is `ImpitResponse` (from `impit`), not
  the DOM's `Response`.** `ImpitResponse` is API-compatible for the fields
  this module reads (`status`, `ok`, `headers`, `text()`, `json()`) but is
  missing others the DOM type declares (`type`, `redirected`, `bodyUsed`,
  `formData()`), so it is not structurally assignable to `Response` -
  `tsc` will fail if the annotation is reverted.
- **`Impit.fetch()` is a native binding, not built on the global `fetch`.**
  `vi.spyOn(globalThis, 'fetch')` will NOT intercept it - it does nothing
  and the real network call goes out. Both `test/http.test.ts` and
  `test/worldBankProcurementNotices.test.ts` mocked the global `fetch` this
  way and were silently broken by the swap (found and fixed the same day
  this was added) - they now mock the `impit` module itself
  (`vi.mock('impit', ...)`, with `vi.hoisted()` for the mock function
  reference, and a real `function` - not an arrow function - as the mock's
  `Impit` implementation, since `new Impit(...)` requires a constructible
  mock). Keep that pattern if either file's tests are extended.

This repo has no `test:live` / `LIVE`-gated test suite (unlike
`florida-tenders-monitor` and `australia-grantconnect-monitor`), so the
post-migration connectivity check against the real World Bank hosts
(`search.worldbank.org/api/v2/procnotices` and
`www.worldbank.org/.../debarred-firms`) was done with an ad-hoc script
calling `fetchJsonWithRetry`/`fetchTextWithRetry` directly, not committed
to the repo. Both hosts returned real data through the new Chrome
TLS/HTTP2 fingerprint.

## V2 delta engine (added 2026-09-08)

This actor was one of 5 found on the account outside the original 9-actor V2 migration mandate. It already had a correctly-NAMED key-value store (no run-scoped `Actor.getValue()`/`setValue()` bug, unlike a sibling actor found the same day) but only flat seen-id tracking on the Procurement Notices sub-source, with `event_type` hardcoded to `'NEW_LISTING'` always.

- `src/fingerprint.ts` / `src/delta.ts`: dual-fingerprint classification (`statusFingerprint` over `notice_status`, `contentFingerprint` over everything else mutable) -> `NEW_LISTING` (first-seen) / `STATUS_CHANGE` / `UPDATED` / `SNAPSHOT_NO_DIFF`. Applies ONLY to `worldBankProcurementNotices` - the "Other Sanctions" sub-source correctly keeps `is_new: null`/`event_type: 'SANCTION'` always, a small static snapshot with no delta concept, unchanged from v1 and NOT a gap.
- **No `CLOSED` event, deliberately** - unlike `actor-19-maritime-sanctions-monitor`'s single-file OFAC feed, this endpoint is genuinely paginated and `maxItemsPerSource`-capped, so a fetch here is never guaranteed to be a complete census. See `src/delta.ts`'s doc comment for the full reasoning (the same false-positive risk already found and fixed on `entrerios-compras-monitor`/`salta-compras-monitor` elsewhere in this fleet).
- `onlyNew`'s meaning changed (disclosed, not silent): now "new or changed since last run" (delivers `STATUS_CHANGE`/`UPDATED` too), not just "never seen before." See `CHANGELOG.md`.
- `src/http.ts`'s retry logic was hardened to be explicitly 429/5xx-calibrated (was: retry on any non-ok status) with `Retry-After` support and jitter - not a critical bug like the one found the same day on `actor-22-drug-safety-recalls-monitor` (429 was never fully excluded here), but tightened for consistency and correctness.

## Known footguns

- No local `Dockerfile` - Apify's implicit build for this template does `COPY . ./` then `npm install --only=prod` ONLY, confirmed against a real build-failure + build log on a sibling actor the same day. **`dist/` MUST be committed, not gitignored.** This repo's `.gitignore` already correctly omits `dist` (confirmed directly before this release) - verify that's still true before every push if the file is ever regenerated from a template.
- **Also run `rm -f tsconfig.tsbuildinfo` before every `npm run build`** when `dist/` was just deleted - `tsc`'s incremental cache doesn't verify its own output files still exist on disk, and can silently no-op a build that looks successful (exit 0, zero files written) if the buildinfo cache thinks nothing changed. This exact failure mode hit a sibling actor (`actor-18-b2b-lead-magnet`) the same day this actor was migrated.
- `mcp/searchMdbProcurement.ts` is outside `tsconfig.json`'s `include` and outside `eslint.config.mjs`'s lint scope - a standalone MCP-tool entry point, not part of the `dist/main.js` build.
- `slugify()` in `src/umsNormalizer.ts` already uses a regex LITERAL `/[̀-ͯ]/g` (the actual Unicode combining-marks range U+0300-U+036F) for diacritics stripping - this is correct and intentional, matching the fix applied to a sibling actor's `RegExp` constructor the same day; do not "clean it up" to the constructor form, which is the exact pattern that fix replaced elsewhere.
- Pricing (`procurementNotices` $0.001/record, `debarredFirms` $0.003/record) was confirmed live via `GET acts/{id}` during this V2 pass - matches the code's documented intent exactly, untouched by this release.
