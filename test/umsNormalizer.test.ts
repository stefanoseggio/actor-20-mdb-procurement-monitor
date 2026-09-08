import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { UnifiedRecordSchema, WorldBankProcNoticesEnvelopeSchema, type WorldBankProcNoticeRaw } from '../src/schemas.js';
import { parseOtherSanctionsHtml } from '../src/sources/worldBankDebarredFirms.js';
import {
    WORLD_BANK_JURISDICTION,
    buildDebarredFirmsDegradedNotice,
    normalizeWorldBankOtherSanction,
    normalizeWorldBankProcurementNotice,
} from '../src/umsNormalizer.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRAPED_AT = '2026-09-07T12:00:00.000Z';

function loadFixtureJson<T>(name: string): T {
    return JSON.parse(readFileSync(join(__dirname, 'fixtures', name), 'utf-8')) as T;
}

function loadFixtureText(name: string): string {
    return readFileSync(join(__dirname, 'fixtures', name), 'utf-8');
}

describe('normalizeWorldBankProcurementNotice', () => {
    const envelope = WorldBankProcNoticesEnvelopeSchema.parse(loadFixtureJson('worldBankProcNotices.json'));
    const [kenyaNotice, indiaNotice, contractAward] = envelope.procnotices;

    it('produces a schema-valid UnifiedRecord from a real captured WB notice', () => {
        const record = normalizeWorldBankProcurementNotice(kenyaNotice, SCRAPED_AT, null);
        expect(() => UnifiedRecordSchema.parse(record)).not.toThrow();
    });

    it('maps the core identity/category fields correctly', () => {
        const record = normalizeWorldBankProcurementNotice(kenyaNotice, SCRAPED_AT, true);

        expect(record.record_id).toBe('wb-procnotice-OP00467118');
        expect(record.event_type).toBe('NEW_LISTING');
        expect(record.scraped_at).toBe(SCRAPED_AT);
        expect(record.is_new).toBe(true);
        expect(record.jurisdiction).toBe(WORLD_BANK_JURISDICTION);
        expect(record.category_or_type).toBe('Request for Expression of Interest');
        expect(record.status_or_estado).toBe('Published');
        expect(record.awarding_or_regulating_agency).toBe('Ministry of Transport and Infrastructure');
        expect(record.reference_number).toBe('KE-MOTI-566726-CS-QCBS');
        expect(record.effective_date_iso).toBe('2026-10-06T00:00:00Z');
        expect(record.publish_date_iso).toBe('2026-09-05T00:00:00.000Z');
    });

    it('honestly nulls value and recipient fields - this WB endpoint carries neither', () => {
        const record = normalizeWorldBankProcurementNotice(kenyaNotice, SCRAPED_AT, null);

        expect(record.recipient_or_defendant_name).toBeNull();
        expect(record.value_native).toBeNull();
        expect(record.value_currency).toBeNull();
        expect(record.value_usd_normalized).toBeNull();
    });

    it('falls back to project_id for entity_identifier_native when bid_reference_no is absent', () => {
        const noBidRef = { ...indiaNotice, bid_reference_no: null };
        const record = normalizeWorldBankProcurementNotice(noBidRef, SCRAPED_AT, null);
        expect(record.entity_identifier_native).toBe(indiaNotice.project_id);
    });

    it('handles a record with many null optional fields (Contract Award notice) without throwing', () => {
        const record = normalizeWorldBankProcurementNotice(contractAward, SCRAPED_AT, false);
        expect(() => UnifiedRecordSchema.parse(record)).not.toThrow();
        expect(record.effective_date_iso).toBeNull();
        expect(record.awarding_or_regulating_agency).toBe('Ministerio de Vivienda, Construccion y Saneamiento');
        expect(record.is_new).toBe(false);
    });

    it('is_new is null when the actor is not run in delta mode', () => {
        const record = normalizeWorldBankProcurementNotice(kenyaNotice, SCRAPED_AT, null);
        expect(record.is_new).toBeNull();
    });
});

describe('normalizeWorldBankOtherSanction', () => {
    const { records: sanctions, degraded } = parseOtherSanctionsHtml(loadFixtureText('worldBankOtherSanctions.html'));

    it('parses the real fixture cleanly (sanity check for the tests below)', () => {
        expect(degraded).toBe(false);
        expect(sanctions).toHaveLength(4);
    });

    it('produces a schema-valid UnifiedRecord for every real captured sanction row', () => {
        for (const raw of sanctions) {
            const record = normalizeWorldBankOtherSanction(raw, SCRAPED_AT);
            expect(() => UnifiedRecordSchema.parse(record)).not.toThrow();
        }
    });

    it('strips the footnote marker into reference_number and cleans the display name', () => {
        const armada = sanctions[0];
        const record = normalizeWorldBankOtherSanction(armada, SCRAPED_AT);

        expect(record.recipient_or_defendant_name).toBe('OAO Armada');
        expect(record.reference_number).toBe('12');
        expect(record.entity_identifier_native).toBe(armada.firmNameRaw);
        expect(record.event_type).toBe('SANCTION');
        expect(record.jurisdiction).toBe(WORLD_BANK_JURISDICTION);
        expect(record.category_or_type).toContain('Letter of reprimand');
    });

    it("keeps a real live-observed source typo's date column verbatim in status_or_estado and returns null effective_date_iso rather than guessing", () => {
        const tpf = sanctions.find((s) => s.firmNameRaw.includes('TPF GETINSA'));
        expect(tpf).toBeDefined();
        const record = normalizeWorldBankOtherSanction(tpf!, SCRAPED_AT);

        expect(record.status_or_estado).toContain('Feberuary');
        expect(record.effective_date_iso).toBeNull();
    });

    it('parses a cleanly-formatted imposition date into effective_date_iso', () => {
        const iqvia = sanctions.find((s) => s.firmNameRaw.includes('IQVIA'));
        expect(iqvia).toBeDefined();
        const record = normalizeWorldBankOtherSanction(iqvia!, SCRAPED_AT);

        expect(record.effective_date_iso).toBe('2025-06-17T00:00:00.000Z');
    });

    it('honestly nulls value fields and is_new - this sub-table has no monetary or delta-tracking concept', () => {
        const record = normalizeWorldBankOtherSanction(sanctions[0], SCRAPED_AT);
        expect(record.value_native).toBeNull();
        expect(record.value_currency).toBeNull();
        expect(record.value_usd_normalized).toBeNull();
        expect(record.is_new).toBeNull();
    });

    it('produces stable, distinct record_ids across all 4 real rows', () => {
        const ids = sanctions.map((raw) => normalizeWorldBankOtherSanction(raw, SCRAPED_AT).record_id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const id of ids) expect(id.startsWith('wb-sanction-')).toBe(true);
    });
});

describe('normalizeWorldBankProcurementNotice - eventType parameter', () => {
    const minimalNotice: WorldBankProcNoticeRaw = { id: 'OP99999' };

    it('defaults to NEW_LISTING when no eventType is given (backward compatible)', () => {
        const record = normalizeWorldBankProcurementNotice(minimalNotice, SCRAPED_AT, true);
        expect(record.event_type).toBe('NEW_LISTING');
    });

    it('uses a caller-supplied eventType (from src/delta.ts classification) when one is given', () => {
        expect(normalizeWorldBankProcurementNotice(minimalNotice, SCRAPED_AT, false, 'STATUS_CHANGE').event_type).toBe('STATUS_CHANGE');
        expect(normalizeWorldBankProcurementNotice(minimalNotice, SCRAPED_AT, false, 'UPDATED').event_type).toBe('UPDATED');
        expect(normalizeWorldBankProcurementNotice(minimalNotice, SCRAPED_AT, false, 'SNAPSHOT_NO_DIFF').event_type).toBe('SNAPSHOT_NO_DIFF');
    });
});

describe('buildDebarredFirmsDegradedNotice', () => {
    it('produces a schema-valid SNAPSHOT_NO_DIFF record pointing at the documented static fallback, never an empty "no sanctions" record', () => {
        const notice = buildDebarredFirmsDegradedNotice(
            SCRAPED_AT,
            'Table 2 header row was not found in the fetched HTML.',
        );

        expect(() => UnifiedRecordSchema.parse(notice)).not.toThrow();
        expect(notice.event_type).toBe('SNAPSHOT_NO_DIFF');
        expect(notice.category_or_type).toBe('extraction_integrity_failure');
        expect(notice.status_or_estado).toContain('Table 2 header row was not found');
        expect(notice.source_document_url).toMatch(/^https:\/\/thedocs\.worldbank\.org\//);
        expect(notice.jurisdiction).toBe(WORLD_BANK_JURISDICTION);
    });
});
