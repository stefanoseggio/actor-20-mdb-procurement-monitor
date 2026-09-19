# Changelog

## [2.1.0](https://github.com/stefanoseggio/actor-20-mdb-procurement-monitor/compare/actor-20-mdb-procurement-monitor-v2.0.0...actor-20-mdb-procurement-monitor-v2.1.0) (2026-09-19)


### Features

* standardize on multi-stage Dockerfile builder pattern ([#10](https://github.com/stefanoseggio/actor-20-mdb-procurement-monitor/issues/10)) ([5d64616](https://github.com/stefanoseggio/actor-20-mdb-procurement-monitor/commit/5d6461629866ce1435d5e8f45636030edcf0aa6b))
* V2 delta engine for Procurement Notices + hardened HTTP retry (2.0.0) ([8fbf1b4](https://github.com/stefanoseggio/actor-20-mdb-procurement-monitor/commit/8fbf1b4856a360f360b01687394c42af6a17edc2))


### Bug Fixes

* bump transitive adm-zip to 0.6.1, resolving a HIGH-severity CVE ([#12](https://github.com/stefanoseggio/actor-20-mdb-procurement-monitor/issues/12)) ([70b0e31](https://github.com/stefanoseggio/actor-20-mdb-procurement-monitor/commit/70b0e311c4df24673d50bc99ef818837420057c0))
* **ci:** pass RELEASE_PLEASE_TOKEN so release PRs skip the bot-approval gate ([802c31b](https://github.com/stefanoseggio/actor-20-mdb-procurement-monitor/commit/802c31b0cf04e12c58db9b5fd5c81502860cd36d))
* correct WB sanctions firm-name parsing and dedupe procnotices pages ([#11](https://github.com/stefanoseggio/actor-20-mdb-procurement-monitor/issues/11)) ([1b1beea](https://github.com/stefanoseggio/actor-20-mdb-procurement-monitor/commit/1b1beea07023ee0574d3dd860b55f9b0645cdf48))
* **package:** remove stale v1 version reference from description ([7da5cac](https://github.com/stefanoseggio/actor-20-mdb-procurement-monitor/commit/7da5cac9b84981c8b7e3976b0c8e1490e2380915))
* restore dist/ tracking (regression from repo-standardization pass) ([#9](https://github.com/stefanoseggio/actor-20-mdb-procurement-monitor/issues/9)) ([7486e62](https://github.com/stefanoseggio/actor-20-mdb-procurement-monitor/commit/7486e6272feda79e2fe3cf348e20b69c89fac3bd))

## 2.0.0 - 2026-09-08

### Added

- Real cross-run delta classification for World Bank Procurement Notices, replacing a flat seen-id list. `src/fingerprint.ts` computes a dual hash pair per notice (`statusFingerprint` over `notice_status` - the real status field this source provides - and `contentFingerprint` over its other mutable fields). `src/delta.ts`'s `classifyProcNotice()` computes `NEW_LISTING` (first-seen, name preserved from v1) / `STATUS_CHANGE` / `UPDATED` / `SNAPSHOT_NO_DIFF`.
- `src/state.ts` rewritten to a `{ entries: Record<source, Record<id, {statusFingerprint, contentFingerprint, lastSeenAt}>>, lastRunAt }` shape (was `{ seenIds: Record<source, string[]>, lastRunAt }`). Named `Actor.openKeyValueStore()` was already correct here - no store-migration risk.
- `is_new` is now always populated (`true`/`false`), not only when `onlyNew` is enabled.
- Hardened `src/http.ts`'s retry logic to be explicitly 429/5xx-calibrated (was: retry on any non-ok status, including permanent 4xx like 400/404 - wasteful but not incorrect, since a genuinely non-retryable error still eventually surfaced after burning through its retry budget). Now distinguishes retryable (429/5xx) from non-retryable (other 4xx) explicitly, adds exponential backoff + jitter, and honors a real `Retry-After` header when present - matching the fix made the same day to a sibling actor (`actor-22-drug-safety-recalls-monitor`), covered by 5 new tests mocking real 429/503/404 scenarios.
- Defensive fix in `src/dateUtils.ts`'s `isWithinDateRange`: added the `diffMs >= 0` guard already proven necessary elsewhere in this fleet (a naive one-sided check lets a future-dated value match every window). Not a live-observed bug here (this actor only applies it to `noticedate`, a retrospective publish date) but fixed proactively.
- `LICENSE` (Apache-2.0, matching the fleet standard), `.github/workflows/test.yaml` (lint+build+test CI - this actor had none), `CHANGELOG.md`, `AGENTS.md`.
- `test/fingerprint.test.ts`, `test/delta.test.ts`, `test/state.test.ts`, `test/http.test.ts`: unit coverage of the new classification/fingerprint/state-persistence/retry logic - previously the actual delta logic (a flat `seenIds` check) had zero dedicated tests, only the pure UMS-mapping layer was tested.

### Changed

- **Disclosed behavior change to `onlyNew`:** now means "new or changed since last run" (delivers `STATUS_CHANGE`/`UPDATED` too), not just "never seen before" - matching the same upgrade made the same day to `actor-22-drug-safety-recalls-monitor` and `actor-19-maritime-sanctions-monitor` in this fleet.
- World Bank "Other Sanctions" sub-source is **unchanged** - still `is_new: null`, `event_type: 'SANCTION'` always, correctly matching this fleet's convention for a source with no delta-tracking concept (a small static snapshot page, not a paginated/dated feed). This was already correct in v1 and did not need fixing.

### Not added (and why)

- **No `CLOSED` event on the procurement-notices sub-source.** Unlike `actor-19-maritime-sanctions-monitor`'s OFAC SDN feed (a single-file, guaranteed-complete export), the World Bank Procurement Notices endpoint is genuinely server-side paginated and the fetch loop stops once `maxItemsPerSource` is reached - a fetch here is not reliably a complete census the way OFAC's is. There is also no independently live-verified evidence this endpoint ever removes a notice from its result set rather than updating its `notice_status` in place (which IS captured as a real `STATUS_CHANGE` here). Adding a CLOSED-by-absence check without that verification would risk the exact false-positive class of bug already found and fixed on this fleet's `entrerios-compras-monitor` and `salta-compras-monitor`.
- **No dual-floor/baseline-floor pagination-limiting mechanism** - not evaluated as needed for this pass; the existing `maxItemsPerSource` cap combined with real state persistence already avoids re-processing already-known notices across runs.
- **No pricing/monetization change.** Confirmed live via `GET acts/{id}` before this release shipped: the two-tier pricing (`procurementNotices` $0.001/record, `debarredFirms` $0.003/record) matches the code's documented intent exactly and is untouched by this release.
