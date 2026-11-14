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
    // First write wins. The whole point of the key is that a retry gets the
    // response the original caller got; letting a concurrent duplicate
    // overwrite it would hand two callers different answers for one request.
    if (this.map.has(key)) return;
    this.map.set(key, value);
  }
}
