import {
  RateLimitStore,
  RateLimiter,
  RateLimitConfig,
} from "../types/rateLimit";

export class TokenBuckerLimiter implements RateLimiter {
  constructor(
    private readonly store: RateLimitStore,
    private readonly config: RateLimitConfig,
    private readonly now: () => number = Date.now,
  ) {}

  async allow(key: string): Promise<boolean> {
    const currentTime = this.now();
    const existing = await this.store.get(key);

    let tokens = existing?.tokens ?? this.config.capacity ?? 0;
    let lastRefillAt = existing?.lastRefillAt ?? currentTime;

    //Calculate how much time has passed
    const elapsedSeconds = Math.max(0, currentTime - lastRefillAt) / 1000;

    //Add tokens based on elapsed time
    tokens = Math.min(
      this.config.capacity ?? 0,
      tokens + elapsedSeconds * (this.config.refillPerSecond ?? 0),
    );

    lastRefillAt = currentTime;

    //No token avialable
    if (tokens < 1) {
      await this.store.set(key, { tokens, lastRefillAt });

      console.log(`BLOCKED ${key} tokens=${tokens}`);

      return false;
    }

    //consume one token
    tokens -= 1;

    this.store.set(key, { tokens, lastRefillAt });

    console.log(`ALLOWED ${key} tokens=${tokens}`);

    return true;
  }
}
