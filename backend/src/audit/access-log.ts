// PHI access audit (NDPA/NDPR): every read of patient data is recorded.
// Postgres impl replaces InMemoryAccessLog (append-only table).
export interface AccessEntry {
  actorId: string;
  role: string;
  incidentId: string;
  resource: "vitals" | "triage" | "handoff";
  at: string;
}

export interface AccessLog {
  record(entry: AccessEntry): Promise<void>;
  list(incidentId?: string): Promise<AccessEntry[]>;
}

export class InMemoryAccessLog implements AccessLog {
  private readonly entries: AccessEntry[] = [];

  async record(entry: AccessEntry): Promise<void> {
    this.entries.push({ ...entry });
  }

  async list(incidentId?: string): Promise<AccessEntry[]> {
    return incidentId
      ? this.entries.filter((e) => e.incidentId === incidentId)
      : [...this.entries];
  }
}
