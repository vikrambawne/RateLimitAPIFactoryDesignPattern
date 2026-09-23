import fs from "node:fs/promises";
import path from "node:path";
import { RateLimitState, RateLimitStore } from "../types/rateLimit";

export class FileStore implements RateLimitStore {
  private readonly filePath: string;
  private data: Record<string, RateLimitState> = {};
  private initialized = false;

  constructor(filePath: string) {
    this.filePath = path.resolve(filePath);
  }

  private async init(): Promise<void> {
    if (this.initialized) return;

    await fs.mkdir(path.dirname(this.filePath), { recursive: true });

    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      this.data = JSON.parse(raw) as Record<string, RateLimitState>;
    } catch (error: unknown) {
      const code =
        error && typeof error === "object" && "code" in error
          ? (error as { code?: string }).code
          : undefined;

      if (code !== "ENOENT") throw error;
      this.data = {};
      await this.persist();
    }

    this.initialized = true;
  }

  private async persist(): Promise<void> {
    const tempFile = `${this.filePath}.tmp`;
    await fs.writeFile(tempFile, JSON.stringify(this.data, null, 2), "utf8");
    await fs.rename(tempFile, this.filePath);
  }

  async get(key: string): Promise<RateLimitState | undefined> {
    await this.init();
    const value = this.data[key];
    return value
      ? {
          ...value,
          timestamps: value.timestamps ? [...value.timestamps] : undefined,
        }
      : undefined;
  }

  async set(key: string, value: RateLimitState): Promise<void> {
    await this.init();
    this.data[key] = {
      ...value,
      timestamps: value.timestamps ? [...value.timestamps] : undefined,
    };
    await this.persist();
  }

  async delete(key: string): Promise<void> {
    await this.init();
    delete this.data[key];
    await this.persist();
  }
}
