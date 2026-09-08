import { createHash } from 'node:crypto';

import type { WorldBankProcNoticeRaw } from './schemas.js';

function hashOf(fields: Record<string, unknown>): string {
    return createHash('sha1').update(JSON.stringify(fields)).digest('hex');
}

export interface RecordFingerprint {
    statusFingerprint: string;
    contentFingerprint: string;
}

/**
 * World Bank Procurement Notice fingerprint. `notice_status` is the real
 * status field this source provides (verified in schemas.ts's raw shape),
 * tracked separately so a status transition (e.g. a notice moving from
 * "Active" to "Closed") is distinguishable from an unrelated content edit.
 * `id` is deliberately excluded - it's the identity field already encoded
 * in record_id, and a fingerprint over an identity field can never usefully
 * change.
 */
export function procNoticeFingerprintOf(raw: WorldBankProcNoticeRaw): RecordFingerprint {
    return {
        statusFingerprint: hashOf({ notice_status: raw.notice_status ?? null }),
        contentFingerprint: hashOf({
            notice_type: raw.notice_type ?? null,
            noticedate: raw.noticedate ?? null,
            submission_deadline_date: raw.submission_deadline_date ?? null,
            submission_deadline_time: raw.submission_deadline_time ?? null,
            project_ctry_name: raw.project_ctry_name ?? null,
            project_id: raw.project_id ?? null,
            project_name: raw.project_name ?? null,
            bid_reference_no: raw.bid_reference_no ?? null,
            bid_description: raw.bid_description ?? null,
            procurement_group: raw.procurement_group ?? null,
            procurement_method_code: raw.procurement_method_code ?? null,
            procurement_method_name: raw.procurement_method_name ?? null,
            contact_address: raw.contact_address ?? null,
            contact_ctry_name: raw.contact_ctry_name ?? null,
            contact_email: raw.contact_email ?? null,
            contact_name: raw.contact_name ?? null,
            contact_organization: raw.contact_organization ?? null,
            contact_phone_no: raw.contact_phone_no ?? null,
            contact_web_url: raw.contact_web_url ?? null,
            submission_date: raw.submission_date ?? null,
            notice_text: raw.notice_text ?? null,
        }),
    };
}
