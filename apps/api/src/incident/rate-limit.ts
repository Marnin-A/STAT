// Counts prior SOS hits per key within a window. In-memory for Phase 1;
// a Postgres/Redis impl replaces it at runtime (sos_rate_limit table).
export interface RateLimitStore {
  hitCount(key: string): Promise<number>;
  record(key: string): Promise<void>;
}

export class InMemoryRateLimitStore implements RateLimitStore {
  private readonly counts = new Map<string, number>();

  async hitCount(key: string): Promise<number> {
    return this.counts.get(key) ?? 0;
  }

  async record(key: string): Promise<void> {
    this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
  }
}
