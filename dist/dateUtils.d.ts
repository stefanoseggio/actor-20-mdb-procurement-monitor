export type DateRangePreset = '24h' | '7d' | '30d';
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
export declare function isWithinDateRange(date: Date | null, preset: DateRangePreset | undefined, now: Date): boolean;
export declare function parseWorldBankNoticeDate(value: string | null | undefined): Date | null;
export declare function toIsoOrNull(date: Date | null): string | null;
export declare function parseWorldBankSanctionDate(value: string | null | undefined): Date | null;
//# sourceMappingURL=dateUtils.d.ts.map