import { TtlCache } from "./cache";

type TokenBucket = {
  tokens: number;
  lastRefill: number;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSec: number;
};

export interface RateLimiter {
  consume: (key: string) => RateLimitResult;
}

export class TokenBucketRateLimiter implements RateLimiter {
  private readonly cache = new TtlCache<TokenBucket>(2_000);

  public constructor(
    private readonly capacity = 120,
    private readonly refillPerSecond = 2
  ) {}

  public consume(key: string): RateLimitResult {
    const now = Date.now();
    const existing = this.cache.get(key) ?? {
      tokens: this.capacity,
      lastRefill: now
    };

    const elapsedSec = Math.max(0, (now - existing.lastRefill) / 1_000);
    const refill = elapsedSec * this.refillPerSecond;
    const available = Math.min(this.capacity, existing.tokens + refill);

    if (available < 1) {
      const retryAfterSec = Math.ceil((1 - available) / this.refillPerSecond);
      this.cache.set(key, { tokens: available, lastRefill: now }, 120_000);

      return {
        allowed: false,
        retryAfterSec
      };
    }

    const next = {
      tokens: available - 1,
      lastRefill: now
    };

    this.cache.set(key, next, 120_000);

    return {
      allowed: true,
      retryAfterSec: 0
    };
  }
}

export const defaultRateLimiter = new TokenBucketRateLimiter();
