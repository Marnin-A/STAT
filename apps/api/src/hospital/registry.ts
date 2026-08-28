import type { Hospital as WireHospital } from "@stat/shared";

/**
 * Server-side hospital record. `webhookUrl` is deployment config, never put on
 * the wire — `toWire` strips it before anything reaches a client.
 */
export interface Hospital extends WireHospital {
  webhookUrl: string | null; // pre-arrival alert webhook (dashboard is via SSE)
}

export function toWire(h: Hospital): WireHospital {
  const { webhookUrl: _webhookUrl, ...wire } = h;
  return wire;
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
