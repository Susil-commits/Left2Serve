/**
 * Options for retryWithBackoff
 */
export interface RetryOptions {
  /** Maximum number of retries before throwing the error */
  retries: number;
  /** The base delay in milliseconds */
  baseDelayMs: number;
  /** The maximum delay in milliseconds */
  maxDelayMs: number;
}

/**
 * Determines if an error is retryable.
 * Do not retry 4xx errors, as they are typically client errors (e.g., bad payload, invalid token).
 * Retry on 5xx errors, timeouts, or network errors (no status code).
 */
export function isRetryable(error: any): boolean {
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
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wraps an async function and retries it with exponential backoff and jitter.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  opts: { retries: number; baseDelayMs: number; maxDelayMs: number }
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= opts.retries || !isRetryable(error)) {
        throw error;
      }

      const expDelay = Math.min(opts.baseDelayMs * Math.pow(2, attempt), opts.maxDelayMs);
      const jitter = Math.random() * opts.baseDelayMs;
      const finalDelay = expDelay + jitter;
      
      await delay(finalDelay);
      attempt++;
    }
  }
}
