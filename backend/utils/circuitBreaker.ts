export class CircuitOpenError extends Error {
  constructor(message = 'Circuit breaker is OPEN. Fast-failing request.') {
    super(message);
    this.name = 'CircuitOpenError';
  }
}

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  failureThreshold: number;
  cooldownMs: number;
  halfOpenMaxAttempts: number;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private consecutiveFailures = 0;
  private openedAt: number | null = null;
  private halfOpenAttempts = 0;
  private lastStateChange: Date = new Date();

  constructor(private opts: CircuitBreakerOptions) {}

  getState(): CircuitState {
    this.checkCooldown();
    return this.state;
  }

  getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }

  getLastStateChange(): string {
    return this.lastStateChange.toISOString();
  }

  private transitionTo(newState: CircuitState) {
    this.state = newState;
    this.lastStateChange = new Date();
    if (newState === 'OPEN') {
      this.openedAt = Date.now();
    } else if (newState === 'CLOSED') {
      this.consecutiveFailures = 0;
      this.openedAt = null;
      this.halfOpenAttempts = 0;
    } else if (newState === 'HALF_OPEN') {
      this.halfOpenAttempts = 0;
    }
  }

  private checkCooldown() {
    if (this.state === 'OPEN' && this.openedAt) {
      if (Date.now() - this.openedAt >= this.opts.cooldownMs) {
        this.transitionTo('HALF_OPEN');
      }
    }
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.checkCooldown();

    if (this.state === 'OPEN') {
      throw new CircuitOpenError();
    }

    if (this.state === 'HALF_OPEN') {
      if (this.halfOpenAttempts >= this.opts.halfOpenMaxAttempts) {
        throw new CircuitOpenError('Circuit breaker is HALF_OPEN and max attempts reached.');
      }
      this.halfOpenAttempts++;
    }

    try {
      const result = await fn();
      // On success
      if (this.state === 'HALF_OPEN') {
        this.transitionTo('CLOSED');
      } else {
        // We are in CLOSED state. Reset failures on success.
        this.consecutiveFailures = 0;
      }
      return result;
    } catch (error) {
      // On failure
      if (this.state === 'HALF_OPEN') {
        this.transitionTo('OPEN');
      } else if (this.state === 'CLOSED') {
        this.consecutiveFailures++;
        if (this.consecutiveFailures >= this.opts.failureThreshold) {
          this.transitionTo('OPEN');
        }
      }
      throw error;
    }
  }
}
