import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchTextWithRetry, HttpError } from '../src/http.js';

function jsonResponse(status: number, body: string, headers: Record<string, string> = {}): Response {
    return new Response(body, { status, headers });
}

describe('fetchTextWithRetry - calibrated 429/503 retry', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    it('retries on HTTP 429', async () => {
        const fetchMock = vi
            .spyOn(globalThis, 'fetch')
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
        vi.spyOn(globalThis, 'fetch')
            .mockResolvedValueOnce(jsonResponse(429, 'slow down', { 'retry-after': '5' }))
            .mockResolvedValueOnce(jsonResponse(200, 'ok'));

        const promise = fetchTextWithRetry('https://search.worldbank.org/api/v2/procnotices', 4, 10);
        await vi.runAllTimersAsync();
        await promise;

        const delays = sleepSpy.mock.calls.map((call) => call[1]);
        expect(delays).toContain(5000);
    });

    it('retries on HTTP 503', async () => {
        const fetchMock = vi
            .spyOn(globalThis, 'fetch')
            .mockResolvedValueOnce(jsonResponse(503, 'Service Unavailable'))
            .mockResolvedValueOnce(jsonResponse(200, 'ok'));

        const promise = fetchTextWithRetry('https://www.worldbank.org/x', 4, 10);
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(result).toBe('ok');
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('does NOT retry a genuine 4xx client error like 404', async () => {
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(jsonResponse(404, 'Not Found'));

        await expect(fetchTextWithRetry('https://search.worldbank.org/api/v2/procnotices', 4, 10)).rejects.toThrow(HttpError);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
