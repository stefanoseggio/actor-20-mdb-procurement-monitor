/**
 * Shared UMS normalizer. Every source in this actor (currently the two
 * World Bank sub-sources; ADB/IDB reserved, see sources/deferredSources.ts)
 * funnels through this one module so all output rows share exactly the same
 * 18-field shape and the same record_id / jurisdiction / event_type
 * conventions - there is no per-source copy of this mapping logic.
 */

import { parseWorldBankNoticeDate, parseWorldBankSanctionDate, toIsoOrNull } from './dateUtils.js';
import type { ProcNoticeEventType } from './delta.js';
import type { UnifiedRecord, WorldBankOtherSanctionRaw, WorldBankProcNoticeRaw } from './schemas.js';
import {
    NOTES_ON_DEBARRED_FIRMS_FALLBACK_URL,
    WORLD_BANK_DEBARRED_FIRMS_URL,
} from './sources/worldBankDebarredFirms.js';
import { WORLD_BANK_PROCNOTICES_URL } from './sources/worldBankProcurementNotices.js';

export const WORLD_BANK_JURISDICTION = 'WB';

// This actor emits more than one native record shape from a single dataset,
// unlike the rest of the fleet (one actor = one native shape). record_id is
// therefore prefixed per sub-source so ids are self-describing and can never
// collide across sub-sources within one run.
const PROCNOTICE_ID_PREFIX = 'wb-procnotice-';
const SANCTION_ID_PREFIX = 'wb-sanction-';

function slugify(value: string): string {
    return (
        value
            .toLowerCase()
            .normalize('NFKD')
            // Strip combining diacritical marks (U+0300-U+036F) left behind by
            // NFKD normalization, e.g. turning "é" into a plain "e".
            .replace(/[̀-ͯ]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 80)
    );
}

// -----------------------------------------------------------------------
// World Bank Procurement Notices -> UMS
// -----------------------------------------------------------------------

export function normalizeWorldBankProcurementNotice(
    raw: WorldBankProcNoticeRaw,
    scrapedAt: string,
    isNew: boolean | null,
    eventType: ProcNoticeEventType = 'NEW_LISTING',
): UnifiedRecord {
    const sourceUrl = `${WORLD_BANK_PROCNOTICES_URL}?format=json&id=${encodeURIComponent(raw.id)}`;

    return {
        record_id: `${PROCNOTICE_ID_PREFIX}${raw.id}`,
        event_type: eventType,
        scraped_at: scrapedAt,
        is_new: isNew,
        source_url: sourceUrl,
        // This WB endpoint carries no winner/bidder name field at all (that
        // lives in a separate WB "Contract Awards" dataset, out of scope for
        // this actor) - null here is an honest "not applicable", not a
        // parsing gap.
        recipient_or_defendant_name: null,
        entity_identifier_native: raw.bid_reference_no ?? raw.project_id ?? null,
        // No monetary value field exists on this endpoint either - same
        // honesty rule as above.
        value_native: null,
        value_currency: null,
        value_usd_normalized: null,
        effective_date_iso: raw.submission_deadline_date ?? null,
        publish_date_iso: toIsoOrNull(parseWorldBankNoticeDate(raw.noticedate)),
        category_or_type: raw.notice_type ?? null,
        status_or_estado: raw.notice_status ?? null,
        awarding_or_regulating_agency: raw.contact_organization ?? 'World Bank',
        jurisdiction: WORLD_BANK_JURISDICTION,
        source_document_url: raw.contact_web_url ?? null,
        reference_number: raw.bid_reference_no ?? null,
    };
}

// -----------------------------------------------------------------------
// World Bank "Other Sanctions" sub-table -> UMS
// -----------------------------------------------------------------------

export function normalizeWorldBankOtherSanction(raw: WorldBankOtherSanctionRaw, scrapedAt: string): UnifiedRecord {
    // The firm-name cell sometimes carries a trailing footnote marker (e.g.
    // "OAO Armada *12"). firmNameRaw is already scoped to just the cell's
    // first <p> by worldBankDebarredFirms.ts (deliberately excluding any
    // address lines that follow in later <p> siblings, which would otherwise
    // run onto the marker and break the strip below - see that file's
    // extractFirmNameCellText comment) - keep it as entity_identifier_native
    // (native, unnormalized) and derive a cleaned display name by stripping
    // a trailing "*<digits>" marker.
    const cleanedName = raw.firmNameRaw.replace(/\*\d+\s*$/, '').trim() || raw.firmNameRaw;
    const referenceMatch = raw.firmNameRaw.match(/\*(\d+)\s*$/);

    return {
        record_id: `${SANCTION_ID_PREFIX}${slugify(cleanedName)}-${slugify(raw.dateOfImpositionRaw)}`,
        event_type: 'SANCTION',
        scraped_at: scrapedAt,
        // This sub-table has no "new since when" concept of its own (it's a
        // small static snapshot page, not a paginated/dated feed) - null is
        // the honest "unknown", matching this fleet's convention for
        // sources with no delta-tracking concept (see UnifiedRecord.is_new
        // doc comment in services/enterprise-sdks/node/src/types.ts).
        is_new: null,
        source_url: WORLD_BANK_DEBARRED_FIRMS_URL,
        recipient_or_defendant_name: cleanedName,
        entity_identifier_native: raw.firmNameRaw,
        value_native: null,
        value_currency: null,
        value_usd_normalized: null,
        effective_date_iso: toIsoOrNull(parseWorldBankSanctionDate(raw.dateOfImpositionRaw)),
        publish_date_iso: null,
        category_or_type: raw.sanctionImposedText,
        // The source column genuinely mixes statuses ("Ongoing") and date
        // ranges in one cell - kept verbatim rather than force-split into a
        // field it doesn't cleanly map to.
        status_or_estado: raw.dateOfImpositionRaw || null,
        awarding_or_regulating_agency: 'World Bank',
        jurisdiction: WORLD_BANK_JURISDICTION,
        source_document_url: raw.sanctionDocumentUrl,
        reference_number: referenceMatch ? referenceMatch[1] : null,
    };
}

// -----------------------------------------------------------------------
// Degraded-extraction fallback notice (worldBankDebarredFirms only)
// -----------------------------------------------------------------------

/**
 * Emitted instead of (never in addition to a false "zero sanctions") normal
 * Other-Sanctions records when parseOtherSanctionsHtml reports a zero-row /
 * missing-table extraction-integrity failure. Points the consumer at the
 * World Bank's own static "Notes on Debarred Firms" PDF as a documented
 * fallback reference, per this actor's degrade-honestly design (see
 * sources/worldBankDebarredFirms.ts header comment).
 */
export function buildDebarredFirmsDegradedNotice(scrapedAt: string, degradedReason: string): UnifiedRecord {
    return {
        record_id: `${SANCTION_ID_PREFIX}degraded-${scrapedAt}`,
        event_type: 'SNAPSHOT_NO_DIFF',
        scraped_at: scrapedAt,
        is_new: null,
        source_url: WORLD_BANK_DEBARRED_FIRMS_URL,
        recipient_or_defendant_name: null,
        entity_identifier_native: null,
        value_native: null,
        value_currency: null,
        value_usd_normalized: null,
        effective_date_iso: null,
        publish_date_iso: null,
        category_or_type: 'extraction_integrity_failure',
        status_or_estado: `degraded: ${degradedReason}`,
        awarding_or_regulating_agency: 'World Bank',
        jurisdiction: WORLD_BANK_JURISDICTION,
        source_document_url: NOTES_ON_DEBARRED_FIRMS_FALLBACK_URL,
        reference_number: null,
    };
}
