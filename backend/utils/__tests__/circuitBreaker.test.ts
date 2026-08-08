import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CircuitBreaker, CircuitOpenError } from '../circuitBreaker.js';
import { retryWithBackoff } from '../retry.js';

describe('CircuitBreaker', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('fail failureThreshold times → state becomes OPEN, next call throws CircuitOpenError without invoking fn', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 3, cooldownMs: 10000, halfOpenMaxAttempts: 1 });
    const fn = vi.fn().mockRejectedValue(new Error('Fail'));

    // 1st fail
    await expect(cb.execute(fn)).rejects.toThrow('Fail');
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.getConsecutiveFailures()).toBe(1);

    // 2nd fail
    await expect(cb.execute(fn)).rejects.toThrow('Fail');
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.getConsecutiveFailures()).toBe(2);

    // 3rd fail -> triggers OPEN
    await expect(cb.execute(fn)).rejects.toThrow('Fail');
    expect(cb.getState()).toBe('OPEN');
    expect(cb.getConsecutiveFailures()).toBe(3);

    // Next call should throw CircuitOpenError immediately
    await expect(cb.execute(fn)).rejects.toThrow(CircuitOpenError);
    // Ensure fn wasn't called again
    expect(fn).toHaveBeenCalledTimes(3); 
  });

  it('after cooldownMs → state is HALF_OPEN, one successful call → CLOSED', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 10000, halfOpenMaxAttempts: 1 });
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('Fail')) // trigger open
      .mockResolvedValueOnce('Success'); // trigger closed

    await expect(cb.execute(fn)).rejects.toThrow('Fail');
    expect(cb.getState()).toBe('OPEN');

    // Advance time past cooldown
    await vi.advanceTimersByTimeAsync(10000);

    expect(cb.getState()).toBe('HALF_OPEN');

    // One successful call
    const result = await cb.execute(fn);
    expect(result).toBe('Success');
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.getConsecutiveFailures()).toBe(0);
  });

  it('HALF_OPEN call fails → back to OPEN', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 1, cooldownMs: 10000, halfOpenMaxAttempts: 1 });
    const fn = vi.fn().mockRejectedValue(new Error('Fail'));

    await expect(cb.execute(fn)).rejects.toThrow('Fail');
    expect(cb.getState()).toBe('OPEN');

    await vi.advanceTimersByTimeAsync(10000);
    expect(cb.getState()).toBe('HALF_OPEN');

    // Fail again
    await expect(cb.execute(fn)).rejects.toThrow('Fail');
    expect(cb.getState()).toBe('OPEN');
  });

  it('Integration: simulate provider down, assert delivery stops retrying (breaker open), then recovers', async () => {
    const cb = new CircuitBreaker({ failureThreshold: 2, cooldownMs: 5000, halfOpenMaxAttempts: 1 });
    const retryOpts = { retries: 2, baseDelayMs: 100, maxDelayMs: 1000 };
    
    // We don't want Math.random affecting test predictability in this complex integration
    vi.spyOn(Math, 'random').mockReturnValue(0);

    let isProviderDown = true;
    const sendNotification = vi.fn().mockImplementation(async () => {
      if (isProviderDown) throw new Error('Network timeout');
      return 'Delivered';
    });

    const triggerNotification = () => 
      cb.execute(() => retryWithBackoff(sendNotification, retryOpts));

    // Request 1: fails inside retryWithBackoff (3 attempts total) -> throws -> Breaker records 1 failure
    const req1 = triggerNotification();
    req1.catch(() => {});
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(100); // Attempt 1 delay
    await vi.advanceTimersByTimeAsync(200); // Attempt 2 delay
    await expect(req1).rejects.toThrow('Network timeout');
    expect(sendNotification).toHaveBeenCalledTimes(3);
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.getConsecutiveFailures()).toBe(1);

    // Request 2: fails -> throws -> Breaker records 2 failures -> Breaker OPEN
    const req2 = triggerNotification();
    req2.catch(() => {});
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(100);
    await vi.advanceTimersByTimeAsync(200);
    await expect(req2).rejects.toThrow('Network timeout');
    expect(sendNotification).toHaveBeenCalledTimes(6);
    expect(cb.getState()).toBe('OPEN');

    // Request 3: Fast fails immediately without calling sendNotification
    await expect(triggerNotification()).rejects.toThrow(CircuitOpenError);
    expect(sendNotification).toHaveBeenCalledTimes(6); // unchanged

    // Provider recovers, but breaker is still OPEN
    isProviderDown = false;
    await expect(triggerNotification()).rejects.toThrow(CircuitOpenError);

    // Wait for cooldown
    await vi.advanceTimersByTimeAsync(5000);
    expect(cb.getState()).toBe('HALF_OPEN');

    // Request 4: Half-open, calls fn, succeeds, breaker CLOSED
    const req4 = triggerNotification(); // sendNotification succeeds on 1st attempt
    await expect(req4).resolves.toBe('Delivered');
    expect(sendNotification).toHaveBeenCalledTimes(7); // incremented by 1
    expect(cb.getState()).toBe('CLOSED');
    expect(cb.getConsecutiveFailures()).toBe(0);
  });
});
