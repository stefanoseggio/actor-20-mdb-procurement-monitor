export function classifyProcNotice(previous, current) {
    if (!previous)
        return 'NEW_LISTING';
    if (previous.statusFingerprint !== current.statusFingerprint)
        return 'STATUS_CHANGE';
    if (previous.contentFingerprint !== current.contentFingerprint)
        return 'UPDATED';
    return 'SNAPSHOT_NO_DIFF';
}
//# sourceMappingURL=delta.js.map