import { z } from 'zod';
// ---------------------------------------------------------------------------
// Unified Master Schema (UMS) - 18 fields, EXACT, mirroring (but NOT
// importing - this package is self-contained per the fleet's per-actor
// isolation convention) services/enterprise-sdks/node/src/types.ts
// `UnifiedRecord`. Null any field that doesn't apply to a given source.
//
// One deliberate deviation from that shared file: there, `jurisdiction` is
// typed as the fleet's closed 11-code `JurisdictionCode` union (AU/UK/FL/
// AR-*/CL). This actor covers a supranational lender (the World Bank), which
// is not a national or subnational government and has no seat in that union
// - so here `jurisdiction` is a plain non-empty string ('WB' for both
// sub-sources in this v1; 'ADB'/'IDB' are reserved, see deferredSources.ts).
// ---------------------------------------------------------------------------
export const UnifiedRecordSchema = z.object({
    record_id: z.string().min(1),
    event_type: z.string().min(1),
    scraped_at: z.string().min(1),
    is_new: z.boolean().nullable(),
    source_url: z.string().nullable(),
    recipient_or_defendant_name: z.string().nullable(),
    entity_identifier_native: z.string().nullable(),
    value_native: z.string().nullable(),
    value_currency: z.string().nullable(),
    value_usd_normalized: z.number().nullable(),
    effective_date_iso: z.string().nullable(),
    publish_date_iso: z.string().nullable(),
    category_or_type: z.string().nullable(),
    status_or_estado: z.string().nullable(),
    awarding_or_regulating_agency: z.string().nullable(),
    jurisdiction: z.string().min(1),
    source_document_url: z.string().nullable(),
    reference_number: z.string().nullable(),
});
// ---------------------------------------------------------------------------
// Actor input
// ---------------------------------------------------------------------------
export const SourceNameSchema = z.enum(['worldBankProcurementNotices', 'worldBankDebarredFirms']);
export const DateRangePresetSchema = z.enum(['24h', '7d', '30d']);
export const ActorInputSchema = z.object({
    sources: z.array(SourceNameSchema).min(1).default(['worldBankProcurementNotices', 'worldBankDebarredFirms']),
    maxItemsPerSource: z.number().int().min(1).max(5000).default(100),
    onlyNew: z.boolean().default(false),
    countryFilter: z.array(z.string()).optional(),
    noticeTypeFilter: z.array(z.string()).optional(),
    dateRange: DateRangePresetSchema.optional(),
});
// ---------------------------------------------------------------------------
// Raw source shape: World Bank Procurement Notices API
// (https://search.worldbank.org/api/v2/procnotices?format=json - confirmed
// live, unauthenticated, 2026-09-07). Field list and envelope shape verified
// against a real live response fetched during development - see README.md.
// ---------------------------------------------------------------------------
export const WorldBankProcNoticeRawSchema = z.object({
    id: z.string(),
    notice_type: z.string().nullable().optional(),
    noticedate: z.string().nullable().optional(),
    notice_lang_name: z.string().nullable().optional(),
    notice_status: z.string().nullable().optional(),
    submission_deadline_date: z.string().nullable().optional(),
    submission_deadline_time: z.string().nullable().optional(),
    project_ctry_name: z.string().nullable().optional(),
    project_id: z.string().nullable().optional(),
    project_name: z.string().nullable().optional(),
    bid_reference_no: z.string().nullable().optional(),
    bid_description: z.string().nullable().optional(),
    procurement_group: z.string().nullable().optional(),
    procurement_method_code: z.string().nullable().optional(),
    procurement_method_name: z.string().nullable().optional(),
    contact_address: z.string().nullable().optional(),
    contact_ctry_name: z.string().nullable().optional(),
    contact_email: z.string().nullable().optional(),
    contact_name: z.string().nullable().optional(),
    contact_organization: z.string().nullable().optional(),
    contact_phone_no: z.string().nullable().optional(),
    contact_web_url: z.string().nullable().optional(),
    submission_date: z.string().nullable().optional(),
    notice_text: z.string().nullable().optional(),
});
// `rows` came back as a JSON number in the live sample; `os`/`page`/`total`
// came back as JSON strings in that same response - the API mixes types
// across these 4 envelope fields, so both are accepted rather than assumed.
const numericLike = z.union([z.number(), z.string()]);
export const WorldBankProcNoticesEnvelopeSchema = z.object({
    rows: numericLike,
    os: numericLike,
    page: numericLike,
    total: numericLike,
    procnotices: z.array(WorldBankProcNoticeRawSchema),
});
// ---------------------------------------------------------------------------
// Raw source shape: World Bank "Other Sanctions" sub-table
// (https://www.worldbank.org/en/projects-operations/procurement/debarred-firms
// - Table 2, confirmed present in static HTML, 2026-09-07). One record per
// <tr>; all 4 real header labels ("Name of Firm & Address", "Date of
// Imposition of Sanction", "Sanction Imposed", "Grounds") are kept as raw
// text - see worldBankDebarredFirms.ts for the header-anchored table locator.
// ---------------------------------------------------------------------------
export const WorldBankOtherSanctionRawSchema = z.object({
    firmNameRaw: z.string().min(1),
    dateOfImpositionRaw: z.string(),
    sanctionImposedText: z.string().nullable(),
    sanctionDocumentUrl: z.string().nullable(),
    groundsRaw: z.string().nullable(),
});
//# sourceMappingURL=schemas.js.map