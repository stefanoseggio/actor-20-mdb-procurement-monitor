import { type WorldBankProcNoticeRaw } from '../schemas.js';
export declare const WORLD_BANK_PROCNOTICES_URL = "https://search.worldbank.org/api/v2/procnotices";
export interface FetchWorldBankProcurementNoticesOptions {
    maxItems: number;
    pageSize?: number;
    countryFilter?: string[];
    noticeTypeFilter?: string[];
}
export declare function fetchWorldBankProcurementNotices(options: FetchWorldBankProcurementNoticesOptions): Promise<WorldBankProcNoticeRaw[]>;
//# sourceMappingURL=worldBankProcurementNotices.d.ts.map