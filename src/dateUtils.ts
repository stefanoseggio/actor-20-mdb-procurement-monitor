export type DateRangePreset = '24h' | '7d' | '30d';

const WINDOW_MS: Record<DateRangePreset, number> = {
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
};

/**
 * Requires `diffMs >= 0`, not just `diffMs <= window` - a naive one-sided
 * check lets any future-dated value match every window (a negative diff is
 * always <= a positive window bound). This actor only calls this against
 * `noticedate` (a notice's publish date, always retrospective in practice),
 * so this is a defensive fix rather than a live-observed bug here - but
 * it's the exact same bug class that DID fire live on this fleet's
 * mendoza-compras-monitor (upcoming bid-opening dates) and
 * pba-tenders-monitor (upcoming fechaApertura), fixed here proactively.
 */
export function isWithinDateRange(date: Date | null, preset: DateRangePreset | undefined, now: Date): boolean {
    if (!preset) return true;
    if (!date) return false;
    const diffMs = now.getTime() - date.getTime();
    return diffMs >= 0 && diffMs <= WINDOW_MS[preset];
}

const MONTH_ABBR: Record<string, number> = {
    jan: 0,
    feb: 1,
    mar: 2,
    apr: 3,
    may: 4,
    jun: 5,
    jul: 6,
    aug: 7,
    sep: 8,
    oct: 9,
    nov: 10,
    dec: 11,
};

// World Bank procurement-notice `noticedate` is rendered "DD-MMM-YYYY" (e.g.
// "05-Sep-2026") - verified against a real live API response, 2026-09-07.
// `submission_deadline_date` / `submission_date` on that same endpoint are
// already full ISO-8601 ("2026-10-06T00:00:00Z") and need no parsing here.
export function parseWorldBankNoticeDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    const match = value.trim().match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
    if (!match) return null;
    const [, dd, mmm, yyyy] = match;
    const month = MONTH_ABBR[mmm.toLowerCase()];
    if (month === undefined) return null;
    return new Date(Date.UTC(Number(yyyy), month, Number(dd)));
}

export function toIsoOrNull(date: Date | null): string | null {
    return date ? date.toISOString() : null;
}

const MONTH_FULL: Record<string, number> = {
    january: 0,
    february: 1,
    march: 2,
    april: 3,
    may: 4,
    june: 5,
    july: 6,
    august: 7,
    september: 8,
    october: 9,
    november: 10,
    december: 11,
};

// The World Bank "Other Sanctions" table's "Date of Imposition of Sanction"
// column is free text: sometimes a status word ("Ongoing"), sometimes a
// single long-form date, sometimes a "Month D, YYYY - Month D, YYYY" range,
// and - confirmed in the live 2026-09-07 fixture - occasionally contains the
// source's own typo (e.g. "Feberuary"). This deliberately only recognizes
// correctly-spelled full month names and returns null otherwise, rather than
// guessing at a misspelling - a null effective_date_iso with the raw text
// preserved verbatim in status_or_estado is more honest than a silently
// "corrected" guess.
export function parseWorldBankSanctionDate(value: string | null | undefined): Date | null {
    if (!value) return null;
    const match = value.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
    if (!match) return null;
    const [, monthName, dd, yyyy] = match;
    const month = MONTH_FULL[monthName.toLowerCase()];
    if (month === undefined) return null;
    return new Date(Date.UTC(Number(yyyy), month, Number(dd)));
}
