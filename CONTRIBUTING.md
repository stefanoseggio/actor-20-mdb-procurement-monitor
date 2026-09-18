# Contributing

This repository ships the real, buildable TypeScript source for the **World Bank Procurement Intelligence - Tenders & Debarment Monitor (Global Development Finance)** Apify Actor. It is independently maintained by Stefano Seggio as part of the [Delta Registry](https://github.com/stefanoseggio) fleet — there is no separate contributor team, but external bug reports, source-coverage proposals, and documentation fixes are welcome.

## Local setup

```bash
git clone https://github.com/stefanoseggio/actor-20-mdb-procurement-monitor.git
cd actor-20-mdb-procurement-monitor
npm install
apify login          # once per machine, needed only for `apify run`
```

No third-party credentials are required — both the World Bank Procurement Notices API and the "Other Sanctions" debarment page are open, unauthenticated public sources.

## Development workflow

```bash
npm run start:dev     # tsx src/main.ts, reads ./storage/key_value_stores/default/INPUT.json
npm run lint           # eslint
npm run lint:fix       # eslint --fix
npm run format         # prettier --write .
npm run build          # tsc
npm test               # vitest run
```

Local runs hit the real, live World Bank endpoints — there is no bundled fixture/mock server. Use a small `maxItemsPerSource` while developing to keep runs fast.

## Branch naming

- `fix/<short-description>` — bug fixes
- `feat/<short-description>` — new input fields, new output fields, new source coverage
- `docs/<short-description>` — README/documentation-only changes
- `chore/<short-description>` — dependency bumps, tooling, CI changes

## Commit convention

This repository follows [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<optional scope>): <short summary>

<optional body>
```

Types used here: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`. The `type` prefix drives automated changelog generation via `release-please` (see [`.github/workflows/release.yml`](.github/workflows/release.yml)) — a `feat:` commit triggers a minor version bump, `fix:` triggers a patch bump, and `feat!:`/a `BREAKING CHANGE:` footer triggers a major bump. Non-conventional commit messages are still accepted but won't be reflected in the auto-generated changelog entry for that change.

## Pull requests

1. Fork or branch, make your change, and ensure `npm run lint`, `npm run build`, and `npm test` all pass locally.
2. Open a PR against `main` using the repository's [PR template](.github/PULL_REQUEST_TEMPLATE.md).
3. CI (`.github/workflows/test.yaml`) runs automatically and must pass before merge.
4. Behavioral changes to the Actor's input/output schema should also update `.actor/input_schema.json` / `.actor/dataset_schema.json` and the corresponding README sections in the same PR — schema and documentation drift is treated as a real bug, not a follow-up.

## Scope boundaries

This Actor covers the World Bank only. A new source proposal (including a future ADB or IDB integration) is evaluated against this Actor's existing compliance doctrine, documented in the README's Reliability section: no CAPTCHA-solving, no fingerprint spoofing, no WAF/OAuth-gate bypass. ADB and IDB were both live-researched and are currently deferred for exactly this reason (ADB sits behind a Cloudflare/WAF challenge; IDB's only structured data route is disallowed by that site's own `robots.txt`) — a proposal to force past either gate will be declined regardless of how valuable the data would be.

## Questions or non-code issues

For questions that aren't a code change (pricing, licensing, enterprise inquiries), use the Apify Store's Issues tab on the [live Actor page](https://apify.com/stefano_seggio/actor-20-mdb-procurement-monitor) rather than a GitHub issue.
