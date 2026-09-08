export declare class HttpError extends Error {
    readonly status: number;
    readonly retryAfterMs: number | null;
    constructor(message: string, status: number, retryAfterMs?: number | null);
}
export declare function fetchTextWithRetry(url: string, maxRetries?: number, baseDelayMs?: number): Promise<string>;
export declare function fetchJsonWithRetry<T>(url: string, maxRetries?: number, baseDelayMs?: number): Promise<T>;
//# sourceMappingURL=http.d.ts.map