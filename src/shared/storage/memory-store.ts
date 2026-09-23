import { RateLimitState, RateLimitStore } from "../types/rateLimit";

export class MemoryStore implements RateLimitStore {
  private readonly data = new Map<string, RateLimitState>();

  async get(key: string): Promise<RateLimitState | undefined> {
    const value = this.data.get(key);
    return value
      ? {
          ...value,
          timestamps: value.timestamps ? [...value.timestamps] : undefined,
        }
      : undefined;
  }

  async set(key: string, value: RateLimitState): Promise<void> {
    this.data.set(key, {
      ...value,
      timestamps: value.timestamps ? [...value.timestamps] : undefined,
    });
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }
}
