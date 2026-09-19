import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchTextWithRetry, HttpError } from '../src/http.js';

function jsonResponse(status: number, body: string, headers: Record<string, string> = {}): Response {
    return new Response(body, { status, headers });
}

// impit's Impit.fetch() is a native binding, not built on the global `fetch` -
// vi.spyOn(globalThis, 'fetch') never intercepts it. Mock the `impit` module
// itself instead, so `new Impit()` in src/http.ts returns an object whose
// `.fetch` is this mock. vi.hoisted() is required because vi.mock() factories
// run before the top-level `const` below would otherwise be initialized.
const { fetchMock } = vi.hoisted(() => ({
    fetchMock: vi.fn<(url: string, init: RequestInit) => Promise<Response>>(),
}));
vi.mock('impit', () => ({
    // Must be a real `function`, not an arrow function - `new Impit(...)` in
    // src/http.ts requires a constructible mock implementation.
    Impit: vi.fn().mockImplementation(function ImpitMock() {
        return { fetch: fetchMock };
    }),
}));

describe('fetchTextWithRetry - calibrated 429/503 retry', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
        fetchMock.mockReset();
    });

    it('retries on HTTP 429', async () => {
        fetchMock
            .mockResolvedValueOnce(jsonResponse(429, 'Too Many Requests'))
            .mockResolvedValueOnce(jsonResponse(200, 'ok'));

        const promise = fetchTextWithRetry('https://search.worldbank.org/api/v2/procnotices', 4, 10);
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(result).toBe('ok');
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('honors a numeric Retry-After header on 429', async () => {
        const sleepSpy = vi.spyOn(globalThis, 'setTimeout');
        fetchMock
            .mockResolvedValueOnce(jsonResponse(429, 'slow down', { 'retry-after': '5' }))
            .mockResolvedValueOnce(jsonResponse(200, 'ok'));

        const promise = fetchTextWithRetry('https://search.worldbank.org/api/v2/procnotices', 4, 10);
        await vi.runAllTimersAsync();
        await promise;

        const delays = sleepSpy.mock.calls.map((call) => call[1]);
        expect(delays).toContain(5000);
    });

    it('retries on HTTP 503', async () => {
        fetchMock
            .mockResolvedValueOnce(jsonResponse(503, 'Service Unavailable'))
            .mockResolvedValueOnce(jsonResponse(200, 'ok'));

        const promise = fetchTextWithRetry('https://www.worldbank.org/x', 4, 10);
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(result).toBe('ok');
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('does NOT retry a genuine 4xx client error like 404', async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(404, 'Not Found'));

        await expect(fetchTextWithRetry('https://search.worldbank.org/api/v2/procnotices', 4, 10)).rejects.toThrow(HttpError);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
