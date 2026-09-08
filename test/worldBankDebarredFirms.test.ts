import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { parseOtherSanctionsHtml } from '../src/sources/worldBankDebarredFirms.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadFixture(name: string): string {
    return readFileSync(join(__dirname, 'fixtures', name), 'utf-8');
}

describe('parseOtherSanctionsHtml', () => {
    it('extracts all 4 rows from the real, live-captured "Other Sanctions" table', () => {
        const html = loadFixture('worldBankOtherSanctions.html');
        const result = parseOtherSanctionsHtml(html);

        expect(result.degraded).toBe(false);
        expect(result.degradedReason).toBeNull();
        expect(result.records).toHaveLength(4);

        const [armada, bumirejo, tpf, iqvia] = result.records;

        expect(armada.firmNameRaw).toContain('OAO Armada');
        expect(armada.dateOfImpositionRaw).toBe('Ongoing');
        expect(armada.sanctionImposedText).toContain('Letter of reprimand');
        expect(armada.sanctionDocumentUrl).toMatch(/^https:\/\//);
        expect(armada.groundsRaw).toContain('Sanctions Procedures');

        expect(bumirejo.firmNameRaw).toContain('PT. Bumirejo');

        expect(tpf.firmNameRaw).toContain('TPF GETINSA EUROESTUDIOS');
        expect(tpf.dateOfImpositionRaw).toContain('Feberuary'); // real, live-observed source typo - kept verbatim
        expect(tpf.groundsRaw).toBe('Corrupt and Collusive Practices');

        expect(iqvia.firmNameRaw).toContain('IQVIA Consulting');
        expect(iqvia.sanctionImposedText).toContain('Conditional Non-debarmen');
    });

    it('reports a degraded extraction-integrity failure (never "zero sanctions") when the header row is not found', () => {
        const html = loadFixture('worldBankOtherSanctionsMissing.html');
        const result = parseOtherSanctionsHtml(html);

        expect(result.degraded).toBe(true);
        expect(result.records).toHaveLength(0);
        expect(result.degradedReason).toMatch(/header row was not found/i);
    });

    it('reports a degraded extraction-integrity failure when the table has no <table> at all', () => {
        const result = parseOtherSanctionsHtml('<html><body><p>no tables here</p></body></html>');

        expect(result.degraded).toBe(true);
        expect(result.records).toHaveLength(0);
    });
});
