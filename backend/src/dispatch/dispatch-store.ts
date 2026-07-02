export type DispatchStatus = "pending" | "accepted" | "rejected";

export interface DispatchRecord {
  id: string;
  incidentId: string;
  unitId: string;
  agencyId: string;
  status: DispatchStatus;
  dispatcherId: string;
  responderId: string | null;
  createdAt: string;
  updatedAt: string;
}

// Persistence port. Postgres impl replaces InMemoryDispatchStore.
export interface DispatchStore {
  put(record: DispatchRecord): Promise<void>;
  get(id: string): Promise<DispatchRecord | null>;
  listByIncident(incidentId: string): Promise<DispatchRecord[]>;
}

export class InMemoryDispatchStore implements DispatchStore {
  private readonly records = new Map<string, DispatchRecord>();

  async put(record: DispatchRecord): Promise<void> {
    this.records.set(record.id, { ...record });
  }

  async get(id: string): Promise<DispatchRecord | null> {
    const r = this.records.get(id);
    return r ? { ...r } : null;
  }

  async listByIncident(incidentId: string): Promise<DispatchRecord[]> {
    return [...this.records.values()].filter((r) => r.incidentId === incidentId);
  }
}
