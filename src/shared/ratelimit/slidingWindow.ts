import {
  RateLimitStore,
  RateLimiter,
  RateLimitConfig,
} from "../types/rateLimit";

export class SlidingWindowLimiter implements RateLimiter {
  constructor(
    private readonly store: RateLimitStore,
    private readonly config: RateLimitConfig,
    private readonly now: () => number = Date.now,
  ) {}

  async allow(key: string): Promise<boolean> {
    const currentTime = this.now();
    const existing = await this.store.get(key);

    // calculate window start time
    const cutoff = currentTime - (this.config.windowMs ?? 0);

    // keep only requests inside the current window
    const timestamps = (existing?.timestamps ?? []).filter(
      (timestamp) => timestamp > cutoff,
    );

    // rate limit exceeded
    if (timestamps.length >= (this.config.maxRequests ?? 0)) {
      await this.store.set(key, {
        timestamps,
      });

      return false;
    }

    //Add current request
    timestamps.push(currentTime);

    await this.store.set(key, {
      timestamps,
    });

    return true;
  }
}
