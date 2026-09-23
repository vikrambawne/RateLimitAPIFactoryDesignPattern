import { SlidingWindowLimiter } from "../ratelimit/slidingWindow";
import { TokenBuckerLimiter } from "../ratelimit/tokenBucket";
import { RateLimitStore, RateLimiter } from "../types/rateLimit";
import { rateLimitConfig } from "../../config/rateLimit";

export function createRateLimiter(
  algorithm: string,
  store: RateLimitStore,
): RateLimiter {
  switch (algorithm) {
    case rateLimitConfig.algorithms.tokenBucket:
      return new TokenBuckerLimiter(store, rateLimitConfig.bucket);

    case rateLimitConfig.algorithms.slidingWindow:
      return new SlidingWindowLimiter(store, rateLimitConfig.window);

    default:
      throw new Error(`Unsupported rate limit algorithm: ${algorithm}`);
  }
}
