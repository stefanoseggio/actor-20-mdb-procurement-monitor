import { Actor } from 'apify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createEmptyState, loadState, saveSourceState } from '../src/state.js';
import type { RecordEntry } from '../src/state.js';

describe('state persistence', () => {
    beforeAll(async () => {
        await Actor.init();
    });

    afterAll(async () => {
        await Actor.exit({ exit: false });
    });

    it('returns an empty state when nothing has been saved yet', async () => {
        const state = await loadState();
        expect(state.entries).toEqual({});
    });

    it('round-trips a saved per-source state', async () => {
        const entry: RecordEntry = { statusFingerprint: 'sh1', contentFingerprint: 'ch1', lastSeenAt: '2026-09-08T00:00:00.000Z' };
        const state = await saveSourceState(createEmptyState(), 'worldBankProcurementNotices', { OP123: entry }, '2026-09-08T00:00:00.000Z');
        expect(state.entries.worldBankProcurementNotices.OP123).toEqual(entry);

        const loaded = await loadState();
        expect(loaded.entries.worldBankProcurementNotices.OP123).toEqual(entry);
        expect(loaded.lastRunAt.worldBankProcurementNotices).toBe('2026-09-08T00:00:00.000Z');
    });

    it('merges new entries with prior state for the same source (does not drop untouched ids)', async () => {
        const newEntry: RecordEntry = { statusFingerprint: 'sh2', contentFingerprint: 'ch2', lastSeenAt: '2026-09-08T01:00:00.000Z' };
        const state = await saveSourceState(await loadState(), 'worldBankProcurementNotices', { OP456: newEntry }, '2026-09-08T01:00:00.000Z');
        expect(state.entries.worldBankProcurementNotices.OP123).toBeDefined();
        expect(state.entries.worldBankProcurementNotices.OP456).toEqual(newEntry);
    });

    it('treats a v1-shaped legacy value ({ seenIds, lastRunAt }) as absent rather than throwing', async () => {
        const store = await Actor.openKeyValueStore('actor-20-mdb-procurement-monitor-delta-state');
        await store.setValue('state', { seenIds: { worldBankProcurementNotices: ['OP1'] }, lastRunAt: { worldBankProcurementNotices: '2026-09-01T00:00:00.000Z' } });
        const loaded = await loadState();
        expect(loaded).toEqual(createEmptyState());
    });
});
