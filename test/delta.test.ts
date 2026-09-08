import { describe, expect, it } from 'vitest';

import { classifyProcNotice } from '../src/delta.js';
import type { RecordFingerprint } from '../src/fingerprint.js';

const FP_A: RecordFingerprint = { statusFingerprint: 'status-1', contentFingerprint: 'content-1' };
const FP_STATUS_CHANGED: RecordFingerprint = { statusFingerprint: 'status-2', contentFingerprint: 'content-1' };
const FP_CONTENT_CHANGED: RecordFingerprint = { statusFingerprint: 'status-1', contentFingerprint: 'content-2' };

describe('classifyProcNotice', () => {
    it('classifies a notice with no prior entry as NEW_LISTING (first-seen)', () => {
        expect(classifyProcNotice(undefined, FP_A)).toBe('NEW_LISTING');
    });

    it('classifies a notice_status change as STATUS_CHANGE', () => {
        expect(classifyProcNotice(FP_A, FP_STATUS_CHANGED)).toBe('STATUS_CHANGE');
    });

    it('classifies a non-status content change as UPDATED', () => {
        expect(classifyProcNotice(FP_A, FP_CONTENT_CHANGED)).toBe('UPDATED');
    });

    it('classifies an identical fingerprint pair as SNAPSHOT_NO_DIFF', () => {
        expect(classifyProcNotice(FP_A, { ...FP_A })).toBe('SNAPSHOT_NO_DIFF');
    });

    it('prioritizes STATUS_CHANGE over UPDATED when both fingerprints differ', () => {
        const both: RecordFingerprint = { statusFingerprint: 'status-2', contentFingerprint: 'content-2' };
        expect(classifyProcNotice(FP_A, both)).toBe('STATUS_CHANGE');
    });
});
