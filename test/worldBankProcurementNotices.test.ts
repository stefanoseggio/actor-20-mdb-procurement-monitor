import { afterEach, describe, expect, it, vi } from 'vitest';

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
    vi.restoreAllMocks();
});

describe('fetchWorldBankProcurementNotices - per-run de-duplication', () => {
    it('de-dupes notices that reappear across pages because the upstream feed grew between fetches', async () => {
        // Simulates the real, confirmed-live failure mode: the feed is
        // sorted newest-first and total keeps climbing between our
        // sequential page fetches (os=0 -> os=2 -> os=4), so a notice
        // inserted at the front shifts every later page's boundary by one
        // and an already-collected notice ("n4") reappears on the next page.
        const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
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
        vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
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
