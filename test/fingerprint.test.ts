import { describe, expect, it } from 'vitest';

import { procNoticeFingerprintOf } from '../src/fingerprint.js';
import type { WorldBankProcNoticeRaw } from '../src/schemas.js';

function makeRaw(overrides: Partial<WorldBankProcNoticeRaw> = {}): WorldBankProcNoticeRaw {
    return {
        id: 'OP00123456',
        notice_type: 'Specific Procurement Notice',
        noticedate: '05-Sep-2026',
        notice_status: 'Active',
        submission_deadline_date: '2026-10-06T00:00:00Z',
        project_ctry_name: 'Kenya',
        project_id: 'P123456',
        project_name: 'Rural Roads Project',
        bid_reference_no: 'KE-MOTI-123456-GO-RFB',
        bid_description: 'Construction of rural access roads',
        procurement_method_name: 'Request for Bids',
        contact_organization: 'Ministry of Transport',
        ...overrides,
    };
}

describe('procNoticeFingerprintOf', () => {
    it('is stable across identical input', () => {
        expect(procNoticeFingerprintOf(makeRaw())).toEqual(procNoticeFingerprintOf(makeRaw()));
    });

    it('statusFingerprint changes when notice_status changes, contentFingerprint does not', () => {
        const a = procNoticeFingerprintOf(makeRaw());
        const b = procNoticeFingerprintOf(makeRaw({ notice_status: 'Closed' }));
        expect(a.statusFingerprint).not.toBe(b.statusFingerprint);
        expect(a.contentFingerprint).toBe(b.contentFingerprint);
    });

    it('contentFingerprint changes when bid_description or submission_deadline_date changes, statusFingerprint does not', () => {
        const a = procNoticeFingerprintOf(makeRaw());
        const descChanged = procNoticeFingerprintOf(makeRaw({ bid_description: 'Updated scope of works' }));
        const deadlineChanged = procNoticeFingerprintOf(makeRaw({ submission_deadline_date: '2026-11-01T00:00:00Z' }));
        expect(a.statusFingerprint).toBe(descChanged.statusFingerprint);
        expect(a.contentFingerprint).not.toBe(descChanged.contentFingerprint);
        expect(a.contentFingerprint).not.toBe(deadlineChanged.contentFingerprint);
    });

    it('does not fingerprint the identity field (id)', () => {
        const a = procNoticeFingerprintOf(makeRaw({ id: 'OP1' }));
        const b = procNoticeFingerprintOf(makeRaw({ id: 'OP2' }));
        expect(a).toEqual(b);
    });

    it('treats a missing (undefined) field the same as an explicit null', () => {
        const a = procNoticeFingerprintOf(makeRaw({ notice_type: null }));
        const b = procNoticeFingerprintOf({ ...makeRaw(), notice_type: undefined });
        expect(a).toEqual(b);
    });
});
