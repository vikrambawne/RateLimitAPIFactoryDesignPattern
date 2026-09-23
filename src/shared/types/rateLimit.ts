export type RateLimitState = {
  tokens?: number;
  lastRefillAt?: number;
  timestamps?: number[];
};

export interface RateLimitStore {
  get(key: string): Promise<RateLimitState | undefined>;
  set(key: string, value: RateLimitState): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface RateLimitConfig {
  maxRequests?: number;
  windowMs?: number;
  capacity?: number;
  refillPerSecond?: number;
}

export interface RateLimiter {
  allow(key: string): Promise<boolean>;
}
