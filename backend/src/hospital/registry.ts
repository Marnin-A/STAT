import type { GeoPoint } from "../incident/projection.js";

export interface Hospital {
  id: string;
  name: string;
  location: GeoPoint;
  capabilities: string[]; // e.g. trauma, cardiac, burn
  availableBeds: number;
  webhookUrl: string | null; // pre-arrival alert webhook (dashboard is via SSE)
  updatedAt: string;
}

// Persistence port. Postgres impl replaces InMemoryHospitalRegistry.
export interface HospitalRegistry {
  upsert(hospital: Hospital): Promise<void>;
  get(id: string): Promise<Hospital | null>;
  list(): Promise<Hospital[]>;
}

export class InMemoryHospitalRegistry implements HospitalRegistry {
  private readonly hospitals = new Map<string, Hospital>();

  async upsert(hospital: Hospital): Promise<void> {
    this.hospitals.set(hospital.id, { ...hospital });
  }

  async get(id: string): Promise<Hospital | null> {
    const h = this.hospitals.get(id);
    return h ? { ...h } : null;
  }

  async list(): Promise<Hospital[]> {
    return [...this.hospitals.values()].map((h) => ({ ...h }));
  }
}
