import { afterEach, describe, expect, it, vi } from 'vitest';

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

import { fetchWorldBankProcurementNotices } from '../src/sources/worldBankProcurementNotices.js';

function envelopeResponse(total: number, ids: string[]): Response {
    const body = {
        rows: ids.length,
        os: 0,
        page: 1,
        total,
        procnotices: ids.map((id) => ({ id })),
    };
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
}

afterEach(() => {
    fetchMock.mockReset();
});

describe('fetchWorldBankProcurementNotices - per-run de-duplication', () => {
    it('de-dupes notices that reappear across pages because the upstream feed grew between fetches', async () => {
        // Simulates the real, confirmed-live failure mode: the feed is
        // sorted newest-first and total keeps climbing between our
        // sequential page fetches (os=0 -> os=2 -> os=4), so a notice
        // inserted at the front shifts every later page's boundary by one
        // and an already-collected notice ("n4") reappears on the next page.
        fetchMock.mockImplementation(async (input) => {
            const url = new URL(String(input));
            const os = Number(url.searchParams.get('os'));
            if (os === 0) return envelopeResponse(5, ['n5', 'n4']);
            if (os === 2) return envelopeResponse(6, ['n4', 'n3']); // total grew; "n4" shifted back into view
            if (os === 4) return envelopeResponse(6, ['n2', 'n1']);
            throw new Error(`unexpected os=${os}`);
        });

        const results = await fetchWorldBankProcurementNotices({ maxItems: 100, pageSize: 2 });

        expect(fetchMock).toHaveBeenCalledTimes(3);

        const ids = results.map((r) => r.id);
        expect(ids).toEqual(['n5', 'n4', 'n3', 'n2', 'n1']);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('returns notices unchanged when no duplicates occur across pages', async () => {
        fetchMock.mockImplementation(async (input) => {
            const url = new URL(String(input));
            const os = Number(url.searchParams.get('os'));
            if (os === 0) return envelopeResponse(4, ['a', 'b']);
            if (os === 2) return envelopeResponse(4, ['c', 'd']);
            throw new Error(`unexpected os=${os}`);
        });

        const results = await fetchWorldBankProcurementNotices({ maxItems: 100, pageSize: 2 });
        expect(results.map((r) => r.id)).toEqual(['a', 'b', 'c', 'd']);
    });
});
