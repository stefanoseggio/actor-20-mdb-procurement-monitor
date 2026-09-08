import { describe, expect, it } from 'vitest';

import {
    isWithinDateRange,
    parseWorldBankNoticeDate,
    parseWorldBankSanctionDate,
    toIsoOrNull,
} from '../src/dateUtils.js';

describe('parseWorldBankNoticeDate', () => {
    it('parses a real DD-MMM-YYYY noticedate value', () => {
        const date = parseWorldBankNoticeDate('05-Sep-2026');
        expect(date?.toISOString()).toBe('2026-09-05T00:00:00.000Z');
    });

    it('returns null for null/undefined/empty/malformed input', () => {
        expect(parseWorldBankNoticeDate(null)).toBeNull();
        expect(parseWorldBankNoticeDate(undefined)).toBeNull();
        expect(parseWorldBankNoticeDate('')).toBeNull();
        expect(parseWorldBankNoticeDate('2026-09-05')).toBeNull();
        expect(parseWorldBankNoticeDate('not a date')).toBeNull();
    });

    it('returns null for an unrecognized month abbreviation', () => {
        expect(parseWorldBankNoticeDate('05-Xyz-2026')).toBeNull();
    });
});

describe('parseWorldBankSanctionDate', () => {
    it('parses a single long-form date', () => {
        const date = parseWorldBankSanctionDate('June 17, 2025');
        expect(date?.toISOString()).toBe('2025-06-17T00:00:00.000Z');
    });

    it('parses the first date out of a "Month D, YYYY - Month D, YYYY" range', () => {
        const date = parseWorldBankSanctionDate('June 17, 2025 – December 16, 2026');
        expect(date?.toISOString()).toBe('2025-06-17T00:00:00.000Z');
    });

    it('returns null for a status word like "Ongoing"', () => {
        expect(parseWorldBankSanctionDate('Ongoing')).toBeNull();
    });

    it('returns null rather than guessing at a real, live-observed source typo ("Feberuary")', () => {
        expect(parseWorldBankSanctionDate('Feberuary 29, 2024 - November 28, 2027')).toBeNull();
    });

    it('returns null for null/undefined/empty input', () => {
        expect(parseWorldBankSanctionDate(null)).toBeNull();
        expect(parseWorldBankSanctionDate(undefined)).toBeNull();
        expect(parseWorldBankSanctionDate('')).toBeNull();
    });
});

describe('toIsoOrNull', () => {
    it('round-trips a Date to ISO and passes through null', () => {
        expect(toIsoOrNull(new Date(Date.UTC(2026, 8, 5)))).toBe('2026-09-05T00:00:00.000Z');
        expect(toIsoOrNull(null)).toBeNull();
    });
});

describe('isWithinDateRange', () => {
    const now = new Date('2026-09-07T12:00:00.000Z');

    it('always passes when no preset is given', () => {
        expect(isWithinDateRange(null, undefined, now)).toBe(true);
    });

    it('rejects a null date when a preset is given', () => {
        expect(isWithinDateRange(null, '24h', now)).toBe(false);
    });

    it('correctly buckets a date at each preset boundary', () => {
        const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000);
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        const twentyDaysAgo = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

        expect(isWithinDateRange(twelveHoursAgo, '24h', now)).toBe(true);
        expect(isWithinDateRange(threeDaysAgo, '24h', now)).toBe(false);
        expect(isWithinDateRange(threeDaysAgo, '7d', now)).toBe(true);
        expect(isWithinDateRange(twentyDaysAgo, '7d', now)).toBe(false);
        expect(isWithinDateRange(twentyDaysAgo, '30d', now)).toBe(true);
    });
});
