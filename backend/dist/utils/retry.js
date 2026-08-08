/**
 * Determines if an error is retryable.
 * Do not retry 4xx errors, as they are typically client errors (e.g., bad payload, invalid token).
 * Retry on 5xx errors, timeouts, or network errors (no status code).
 */
export function isRetryable(error) {
    // If it has a status or statusCode property in the 4xx range, do not retry
    const status = error?.status || error?.statusCode || error?.response?.status;
    if (typeof status === 'number' && status >= 400 && status < 500) {
        // 429 Too Many Requests could theoretically be retried, 
        // but typically it needs special handling (Retry-After header), 
        // so we'll treat 4xx generally as non-retryable unless specified otherwise.
        if (status !== 429) {
            return false;
        }
    }
    // If we can't determine the status or it's not a 4xx, we assume it's a network error or 5xx
    return true;
}
/**
 * Promisified setTimeout
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
/**
 * Wraps an async function and retries it with exponential backoff and jitter.
 */
export async function retryWithBackoff(fn, opts) {
    let attempt = 0;
    while (true) {
        try {
            return await fn();
        }
        catch (error) {
            if (attempt >= opts.retries || !isRetryable(error)) {
                throw error; // Throw the last error if exhausted or non-retryable
            }
            // Calculate exponential backoff delay
            // Min of (base * 2^attempt) and maxDelay
            const expDelay = Math.min(opts.baseDelayMs * Math.pow(2, attempt), opts.maxDelayMs);
            // Add "Full Jitter": random value between 0 and the calculated exponential delay
            // Wait, the prompt specifically requested:
            // "Delay per attempt: min(baseDelayMs * 2^attempt, maxDelayMs) + random jitter (0–baseDelayMs)."
            // Let's implement exactly what the prompt asked for.
            const jitter = Math.random() * opts.baseDelayMs;
            const finalDelay = expDelay + jitter;
            await delay(finalDelay);
            attempt++;
        }
    }
}
