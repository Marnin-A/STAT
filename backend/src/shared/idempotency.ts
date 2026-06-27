// Stores the result of a mutation keyed by Idempotency-Key so retries return
// the original response. In-memory for Phase 1; Redis/Postgres at runtime.
export interface IdempotencyStore {
  get(key: string): Promise<unknown | undefined>;
  set(key: string, value: unknown): Promise<void>;
}

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly map = new Map<string, unknown>();

  async get(key: string): Promise<unknown | undefined> {
    return this.map.get(key);
  }

  async set(key: string, value: unknown): Promise<void> {
    this.map.set(key, value);
  }
}
