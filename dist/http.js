// Plain fetch()-with-exponential-backoff-retry, NO proxy - matching this
// fleet's standing convention (see e.g. uk-hse-enforcement-monitor/src/http.ts).
//
// Verified live 2026-09-07, both hosts this actor calls:
//  - search.worldbank.org: no robots.txt (404 - no restrictions declared),
//    unauthenticated GET, no Cloudflare/WAF challenge observed.
//  - www.worldbank.org: robots.txt present (`User-agent: * / Allow: /`) and
//    does NOT disallow /en/projects-operations/procurement/debarred-firms.
//
// Two hosts researched and NOT wired into this module, documented here so
// the reason they're absent is explicit rather than a silent omission:
//  - adb.org: every path tested (including /robots.txt itself) returns a
//    Cloudflare "Just a moment..." interstitial (HTTP 403 from a bare
//    fetch/curl; the challenge page's CSP references challenges.cloudflare.com).
//    That is a WAF/bot-detection gate - out of scope per this fleet's
//    compliance doctrine (no WAF bypass, no fingerprint spoofing).
//  - data.iadb.org: real CKAN REST API confirmed live (package_show /
//    datastore_search both return valid JSON), but that host's own
//    robots.txt explicitly disallows `/api/`, `/datastore/dump/`,
//    `/file/download/` and `/dataset/download/` ("Block direct download
//    paths to force landing page traffic") - i.e. every programmatic access
//    path to the data is robots-disallowed by the publisher's own policy.
//  See src/sources/deferredSources.ts and README.md for the full writeup.
async function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
const JITTER_FRACTION = 0.25;
export class HttpError extends Error {
    status;
    retryAfterMs;
    constructor(message, status, retryAfterMs = null) {
        super(message);
        this.status = status;
        this.retryAfterMs = retryAfterMs;
        this.name = 'HttpError';
    }
}
/** `Retry-After` per RFC 9110: either a delay in seconds or an HTTP-date. Returns null (fall back to computed backoff) if absent/unparseable. */
function parseRetryAfterMs(headerValue) {
    if (!headerValue)
        return null;
    const seconds = Number(headerValue);
    if (Number.isFinite(seconds))
        return Math.max(0, seconds * 1000);
    const dateMs = Date.parse(headerValue);
    if (!Number.isNaN(dateMs))
        return Math.max(0, dateMs - Date.now());
    return null;
}
/**
 * 429 (rate limited) and 5xx (server-side/temporary) are worth retrying.
 * Other 4xx (400/404/etc) are permanent client errors - retrying an
 * identical malformed request wastes nothing here (unlike a rate-limited
 * host) but still can't succeed, so it's returned as-is instead. Explicit,
 * calibrated retry logic - not "retry on any non-ok status", which the
 * previous version of this function did (harmless in practice for a
 * genuinely non-retryable 4xx, but not the deliberate 429/5xx-aware
 * behavior this fix makes explicit, matching the fix already made the same
 * day on this fleet's actor-22-drug-safety-recalls-monitor).
 */
function isRetryableStatus(status) {
    return status === 429 || status >= 500;
}
async function fetchWithRetry(url, maxRetries = 4, baseDelayMs = 1000) {
    let lastError = new Error('unreachable');
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, { redirect: 'follow' });
            if (!response.ok) {
                const retryAfterMs = parseRetryAfterMs(response.headers.get('retry-after'));
                throw new HttpError(`HTTP ${response.status} for ${url}`, response.status, retryAfterMs);
            }
            return response;
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (error instanceof HttpError && !isRetryableStatus(error.status)) {
                throw error;
            }
            if (attempt >= maxRetries)
                break;
            const backoffMs = baseDelayMs * 2 ** attempt;
            const jitterMs = Math.random() * backoffMs * JITTER_FRACTION;
            const delayMs = error instanceof HttpError && error.retryAfterMs !== null ? error.retryAfterMs : backoffMs + jitterMs;
            await sleep(delayMs);
        }
    }
    throw lastError;
}
export async function fetchTextWithRetry(url, maxRetries = 4, baseDelayMs = 1000) {
    const response = await fetchWithRetry(url, maxRetries, baseDelayMs);
    return response.text();
}
export async function fetchJsonWithRetry(url, maxRetries = 4, baseDelayMs = 1000) {
    const response = await fetchWithRetry(url, maxRetries, baseDelayMs);
    return (await response.json());
}
//# sourceMappingURL=http.js.map