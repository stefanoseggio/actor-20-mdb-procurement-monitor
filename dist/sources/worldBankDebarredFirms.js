import * as cheerio from 'cheerio';
import { fetchTextWithRetry } from '../http.js';
export const WORLD_BANK_DEBARRED_FIRMS_URL = 'https://www.worldbank.org/en/projects-operations/procurement/debarred-firms';
// Static fallback reference used when extraction degrades (see
// DebarredFirmsExtractionResult below) - the World Bank's own PDF summary of
// the debarment regime, independent of the page's live grid/table markup.
export const NOTES_ON_DEBARRED_FIRMS_FALLBACK_URL = 'https://thedocs.worldbank.org/en/doc/387181466627871302-0290022021/original/WorldBankNotesonDebarredFirmsandIndividuals.pdf';
// Verified live 2026-09-07: this page renders TWO tables of very different
// character.
//
// Table 1 ("Debarred & Cross-Debarred Firms and Individuals") is a Kendo UI
// grid (`$("#k-debarred-firms").kendoGrid(...)`) whose data source is the
// UNDOCUMENTED gateway
//   https://apigwext.worldbank.org/dvsvc/v1.0/json/APPLICATION/ADOBE_EXPRNCE_MGR/FIRM/SANCTIONED_FIRM
// (URL confirmed present verbatim in this page's inline <script> as the
// grid's `transport.read.url`). It is NOT present in the plain-fetched HTML
// (Kendo renders it client-side from that JSON call) and, per this fleet's
// compliance doctrine, an undocumented internal API gateway is not treated
// as a source - so Table 1 is intentionally never queried, by this module or
// any other. Do not "fix" this by pointing fetchWithRetry at that gateway.
//
// Table 2 ("Other Sanctions") IS a plain static <table> with real, semantic
// <b> header text ("Name of Firm & Address", "Date of Imposition of
// Sanction", "Sanction Imposed", "Grounds") present verbatim in the
// plain-fetched HTML - confirmed live 2026-09-07. That table is the entire
// scope of this module. It is located by matching its header row's text
// against these patterns (semantic, content-anchored - not a fabricated CSS
// class, since the page defines none for this hand-authored table).
const OTHER_SANCTIONS_HEADER_PATTERNS = [
    /name of firm/i,
    /date of imposition/i,
    /sanction imposed/i,
    /grounds/i,
];
function findOtherSanctionsTable($) {
    const tables = $('table').toArray();
    for (const table of tables) {
        const headerRowText = $(table).find('tr').first().text().replace(/\s+/g, ' ');
        const isOtherSanctionsTable = OTHER_SANCTIONS_HEADER_PATTERNS.every((pattern) => pattern.test(headerRowText));
        if (isOtherSanctionsTable)
            return $(table);
    }
    return null;
}
/**
 * Pure parser - no network I/O - so it can be exercised in tests against a
 * fixture without a live fetch, and reused directly by
 * fetchWorldBankOtherSanctions below.
 */
export function parseOtherSanctionsHtml(html) {
    const $ = cheerio.load(html);
    const table = findOtherSanctionsTable($);
    if (!table) {
        return {
            records: [],
            degraded: true,
            degradedReason: 'Table 2 ("Other Sanctions") header row was not found in the fetched HTML - the page structure may have changed. Never interpreted as "no sanctions currently exist".',
        };
    }
    const rows = table.find('tr').toArray().slice(1); // skip the header row itself
    const records = [];
    for (const row of rows) {
        const cells = $(row).find('td').toArray();
        if (cells.length < 4)
            continue;
        const firmNameRaw = $(cells[0]).text().replace(/\s+/g, ' ').trim();
        if (!firmNameRaw)
            continue;
        const dateOfImpositionRaw = $(cells[1]).text().replace(/\s+/g, ' ').trim();
        const sanctionCell = $(cells[2]);
        const sanctionImposedText = sanctionCell.text().replace(/\s+/g, ' ').trim() || null;
        const sanctionDocumentUrl = sanctionCell.find('a').first().attr('href') ?? null;
        const groundsRaw = $(cells[3]).text().replace(/\s+/g, ' ').trim() || null;
        records.push({ firmNameRaw, dateOfImpositionRaw, sanctionImposedText, sanctionDocumentUrl, groundsRaw });
    }
    if (records.length === 0) {
        return {
            records: [],
            degraded: true,
            degradedReason: 'Table 2 header row matched but zero data rows were extracted from it - treated as an extraction-integrity failure (the table markup likely changed shape), never silently reported as "no debarred firms/sanctions exist".',
        };
    }
    return { records, degraded: false, degradedReason: null };
}
export async function fetchWorldBankOtherSanctions() {
    const html = await fetchTextWithRetry(WORLD_BANK_DEBARRED_FIRMS_URL);
    return parseOtherSanctionsHtml(html);
}
//# sourceMappingURL=worldBankDebarredFirms.js.map