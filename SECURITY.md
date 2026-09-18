# Security Policy

## Supported versions

This Actor follows [semantic versioning](https://semver.org/) via automated release tagging (see [`.github/workflows/release.yml`](.github/workflows/release.yml)). Only the latest published major version receives security fixes — there is no long-term-support branch for older majors, consistent with this being a single-maintainer, independently-operated Actor rather than an enterprise product with a formal support matrix.

## Reporting a vulnerability

**Preferred: GitHub Private Vulnerability Reporting.** This repository has private vulnerability reporting enabled — go to the **Security** tab → **Report a vulnerability** to open a private advisory visible only to the maintainer until a fix is ready. This is the correct channel for anything that shouldn't be disclosed in a public issue (credential handling, injection risks, dependency CVEs affecting this Actor's real usage, etc.).

**Do not** open a public GitHub issue for a suspected security vulnerability — use private reporting instead so the disclosure stays coordinated.

## What's actually in scope

This Actor's real attack surface, honestly assessed:

- **No credential handling of any kind.** This Actor requires no third-party API key or BYOK secret (see the README's Cost & BYOK Disclosure section) — both the World Bank Procurement Notices API and the "Other Sanctions" debarment page are open, unauthenticated public sources. There is no customer secret this Actor could leak.
- **No user-supplied code execution.** Input is a fixed JSON schema (`sources`, `maxItemsPerSource`, `onlyNew`, `countryFilter`, `noticeTypeFilter`, `dateRange`) validated against a real Zod schema (`src/schemas.ts`) — there is no arbitrary-code or arbitrary-URL input surface.
- **Dependency vulnerabilities** in `package.json`'s real dependency tree (`apify`, `cheerio`, `zod`, and dev dependencies) are a real, ongoing concern — tracked via Dependabot (`.github/dependabot.yml`) and GitHub's own dependency/secret scanning, both enabled on this repository.
- **Source-feed integrity** (a compromised or spoofed World Bank endpoint) is outside this Actor's control — it fetches from the World Bank's own official, publicly documented URLs over HTTPS and does not implement independent content-signing verification beyond standard TLS.

## Response expectations

This is an independently developed and maintained Actor with no contractual security SLA. In practice, security reports are typically triaged within 48 hours — the same disclosed norm as this Actor's general support triage (see the README's Support & Enterprise SLA section) — though there is no guaranteed fix timeline. Reports that turn out to be genuine, exploitable vulnerabilities will be credited in the fix's release notes unless the reporter requests otherwise.

## Enterprise / institutional customers

If your organization requires a signed security addendum, a formal disclosure SLA, or a security questionnaire completed as part of procurement, open an issue against this Actor's [Store page](https://apify.com/stefano_seggio/actor-20-mdb-procurement-monitor) or connect via [LinkedIn](https://www.linkedin.com/in/stefanoseggio-deltaregistry) — these are handled case-by-case, not something this file can commit to on Stefano's behalf.
