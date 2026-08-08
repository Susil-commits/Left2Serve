import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { retryWithBackoff, isRetryable } from '../retry.js';
describe('retryWithBackoff', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        // We mock Math.random so we can predictably test delays (jitter)
        vi.spyOn(Math, 'random').mockReturnValue(0.5);
    });
    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });
    it('mock fn to fail twice then succeed → succeeds on 3rd attempt, delays roughly follow exponential pattern', async () => {
        let attempt = 0;
        const fn = vi.fn().mockImplementation(async () => {
            attempt++;
            if (attempt <= 2) {
                throw new Error('Transient error');
            }
            return 'Success!';
        });
        const opts = { retries: 3, baseDelayMs: 100, maxDelayMs: 1000 };
        // We can't await this directly without advancing timers because it will block
        const promise = retryWithBackoff(fn, opts);
        // Initial call happens synchronously before the first delay
        await Promise.resolve(); // flush microtasks
        // Attempt 1: Fails. Delay calculation: expDelay = min(100*1, 1000) = 100.
        // Jitter = 0.5 * 100 = 50. Total = 150ms.
        await vi.advanceTimersByTimeAsync(150);
        // Attempt 2: Fails. Delay calculation: expDelay = min(100*2, 1000) = 200.
        // Jitter = 0.5 * 100 = 50. Total = 250ms.
        await vi.advanceTimersByTimeAsync(250);
        // Attempt 3: Succeeds.
        const result = await promise;
        expect(result).toBe('Success!');
        expect(fn).toHaveBeenCalledTimes(3);
    });
    it('mock fn to always fail → throws after retries exhausted', async () => {
        const error = new Error('Persistent error');
        const fn = vi.fn().mockRejectedValue(error);
        const opts = { retries: 2, baseDelayMs: 100, maxDelayMs: 1000 };
        const promise = retryWithBackoff(fn, opts);
        promise.catch(() => { }); // prevent unhandled rejection hook
        // Attempt 1
        await Promise.resolve();
        await vi.advanceTimersByTimeAsync(150); // Delay 1
        // Attempt 2
        await vi.advanceTimersByTimeAsync(250); // Delay 2
        // Attempt 3 (exhausted)
        await expect(promise).rejects.toThrow('Persistent error');
        expect(fn).toHaveBeenCalledTimes(3);
    });
    it('mock a non-retryable error → throws immediately, no retry attempted', async () => {
        const error = new Error('Bad request');
        error.status = 400; // 400 is non-retryable
        const fn = vi.fn().mockRejectedValue(error);
        const opts = { retries: 3, baseDelayMs: 100, maxDelayMs: 1000 };
        await expect(retryWithBackoff(fn, opts)).rejects.toThrow('Bad request');
        expect(fn).toHaveBeenCalledTimes(1);
    });
});
describe('isRetryable', () => {
    it('returns false for 4xx errors except 429', () => {
        expect(isRetryable({ status: 400 })).toBe(false);
        expect(isRetryable({ statusCode: 404 })).toBe(false);
        expect(isRetryable({ response: { status: 403 } })).toBe(false);
    });
    it('returns true for 429, 5xx, and generic errors', () => {
        expect(isRetryable({ status: 429 })).toBe(true);
        expect(isRetryable({ status: 500 })).toBe(true);
        expect(isRetryable({ status: 502 })).toBe(true);
        expect(isRetryable(new Error('Network error'))).toBe(true);
    });
});
