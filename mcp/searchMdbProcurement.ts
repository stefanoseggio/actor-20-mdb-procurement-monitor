/**
 * MCP tool registration spec for this actor's data, following the real
 * fleet pattern in services/mcp-gateway/src/mcp/tools/searchGovernmentTenders.ts
 * + registry.ts (verified by directly reading those files this session):
 * a zod input schema -> a module exporting TOOL_NAME, description,
 * inputSchema, jsonSchema = zodToJsonSchema(inputSchema, TOOL_NAME), and an
 * async handler(input, ctx) that delegates to a shared query router rather
 * than fetching data itself.
 *
 * This file is NOT wired into services/mcp-gateway/src/mcp/tools/registry.ts
 * (that directory is explicitly out of bounds for this task) - it is the
 * portable tool definition this actor's data would register with, ready to
 * be added to that registry's `toolRegistry` array by whoever owns that
 * service, exactly the way the other 4 tools there are declared.
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

// Mirrors src/schemas.ts UnifiedRecordSchema's 18 fields without importing
// it directly, matching this package's self-contained-per-actor boundary
// (mcp/ is a sibling of src/, not part of the tsc build - see tsconfig.json
// `include`). Kept field-for-field identical to src/schemas.ts by hand.
const unifiedRecordShapeSchema = z.object({
    record_id: z.string(),
    event_type: z.string(),
    scraped_at: z.string(),
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
    jurisdiction: z.string(),
    source_document_url: z.string().nullable(),
    reference_number: z.string().nullable(),
});

export const TOOL_NAME = 'search_mdb_procurement';

// 'ADB' and 'IDB' are listed as accepted-but-currently-empty values rather
// than omitted outright, so a caller's filter doesn't silently 400 - the
// query router (fetchRecords, below) is expected to return an empty result
// with a partial-failure entry explaining the live deferral, matching this
// gateway's existing partial-failure convention (PartialFailure in
// services/enterprise-sdks/node/src/types.ts) rather than a hard error.
export const searchMdbProcurementInputSchema = z.object({
    bank: z
        .array(z.enum(['WB', 'ADB', 'IDB']))
        .default(['WB'])
        .describe(
            "Multilateral Development Bank(s) to search. 'WB' (World Bank) is the only bank with live data as of 2026-09-07 - 'ADB' and 'IDB' are accepted for forward-compatibility but currently return zero records plus a partial_failure entry explaining the live-researched compliance deferral (Cloudflare/WAF for ADB; Power BI embed + robots.txt-blocked API for IDB - see this actor's README.md).",
        ),
    record_type: z
        .enum(['procurement_notice', 'sanction'])
        .optional()
        .describe(
            'Filter to only NEW_LISTING procurement notices or only SANCTION (Other Sanctions) records. Omit for both.',
        ),
    country: z
        .string()
        .optional()
        .describe("Free-text match against the notice's project country (World Bank procurement notices only)."),
    keywords: z
        .string()
        .optional()
        .describe(
            'Free-text match against project_name/bid_description (procurement notices) or recipient_or_defendant_name (sanctions).',
        ),
    date_from: z
        .string()
        .optional()
        .describe('ISO-8601 date - inclusive lower bound on publish_date_iso / effective_date_iso.'),
    date_to: z
        .string()
        .optional()
        .describe('ISO-8601 date - inclusive upper bound on publish_date_iso / effective_date_iso.'),
    only_new: z.coerce
        .boolean()
        .default(false)
        .describe(
            'When true, returns only records with is_new === true (requires the underlying actor run to have been executed in delta mode).',
        ),
    max_results: z.coerce.number().int().min(1).max(1000).default(100),
});

export type SearchMdbProcurementInput = z.infer<typeof searchMdbProcurementInputSchema>;

export const inputSchema = searchMdbProcurementInputSchema;
/** Real JSON Schema derived from the single zod source above - not hand-duplicated. */
export const jsonSchema = zodToJsonSchema(searchMdbProcurementInputSchema, TOOL_NAME);

export const description =
    "Searches structured procurement notices and debarment/sanction records from Multilateral Development Banks, normalized to the fleet's 18-field Unified Master Schema. Currently backed by two live World Bank sources: the public Procurement Notices API (goods/works/consulting-services notices across active World Bank-financed projects - no monetary value or winner/bidder-name field is available on this endpoint, both are always null) and the 'Other Sanctions' debarment sub-table (a small, slowly-changing list - not the full Debarred Firms register, which is rendered by a client-side grid this actor does not query). ADB and IDB are accepted as `bank` filter values for forward compatibility but currently return zero records with a partial_failure explaining the live-researched compliance deferral, not silently empty results.";

export interface PartialFailure {
    bank: string;
    reason: string;
}

export interface SearchMdbProcurementOutput {
    query_id: string;
    result_count: number;
    partial_failure: boolean;
    failed_banks: PartialFailure[];
    records: z.infer<typeof unifiedRecordShapeSchema>[];
}

/**
 * Minimal local stand-in for services/mcp-gateway/src/mcp/tools/context.ts's
 * ToolContext - deliberately NOT importing that file (services/mcp-gateway
 * is out of bounds for this task). Shaped so the real gateway's ToolContext
 * satisfies this interface structurally if/when this tool is wired into
 * that registry.
 */
export interface MdbProcurementQueryRouter {
    fetchRecords(params: {
        banks: SearchMdbProcurementInput['bank'];
        recordType?: SearchMdbProcurementInput['record_type'];
        onlyNew: boolean;
        maxResults: number;
    }): Promise<{
        records: z.infer<typeof unifiedRecordShapeSchema>[];
        partialFailures: PartialFailure[];
    }>;
}

export interface ToolContext {
    queryRouter: MdbProcurementQueryRouter;
}

let queryCounter = 0;

export async function handler(input: SearchMdbProcurementInput, ctx: ToolContext): Promise<SearchMdbProcurementOutput> {
    const result = await ctx.queryRouter.fetchRecords({
        banks: input.bank,
        recordType: input.record_type,
        onlyNew: input.only_new,
        maxResults: input.max_results,
    });

    const filtered = result.records.filter((record) => {
        if (input.country && record.jurisdiction !== 'WB') return true; // country filter only meaningful for WB procurement notices
        if (input.keywords) {
            const haystack =
                `${record.recipient_or_defendant_name ?? ''} ${record.category_or_type ?? ''}`.toLowerCase();
            if (!haystack.includes(input.keywords.toLowerCase())) return false;
        }
        if (input.date_from) {
            const date = record.publish_date_iso ?? record.effective_date_iso;
            if (!date || date < input.date_from) return false;
        }
        if (input.date_to) {
            const date = record.publish_date_iso ?? record.effective_date_iso;
            if (!date || date > input.date_to) return false;
        }
        return true;
    });

    queryCounter += 1;

    return {
        query_id: `qry_${Date.now().toString(36)}_${queryCounter}`,
        result_count: filtered.length,
        partial_failure: result.partialFailures.length > 0,
        failed_banks: result.partialFailures,
        records: filtered,
    };
}
