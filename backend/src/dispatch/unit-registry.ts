import type { GeoPoint } from "../incident/projection.js";

export type UnitType = "medical" | "security" | "fire";
export type UnitStatus = "available" | "assigned" | "out_of_service";

export interface Unit {
  id: string;
  agencyId: string;
  type: UnitType;
  callSign: string;
  status: UnitStatus;
  location: GeoPoint | null;
  updatedAt: string;
}

// Persistence port. Postgres/PostGIS impl replaces InMemoryUnitRegistry;
// `reserve` maps to `UPDATE units SET status='assigned' WHERE id=$1 AND
// status='available'` so the same atomicity holds under concurrency.
export interface UnitRegistry {
  upsert(unit: Unit): Promise<void>;
  get(id: string): Promise<Unit | null>;
  list(agencyId?: string): Promise<Unit[]>;
  // Atomic available -> assigned. False when unit is not available.
  reserve(id: string, at: string): Promise<boolean>;
  // assigned -> available. False when unit was not assigned.
  release(id: string, at: string): Promise<boolean>;
  setLocation(id: string, location: GeoPoint, at: string): Promise<Unit | null>;
}

export class InMemoryUnitRegistry implements UnitRegistry {
  private readonly units = new Map<string, Unit>();

  async upsert(unit: Unit): Promise<void> {
    this.units.set(unit.id, { ...unit });
  }

  async get(id: string): Promise<Unit | null> {
    const u = this.units.get(id);
    return u ? { ...u } : null;
  }

  async list(agencyId?: string): Promise<Unit[]> {
    const all = [...this.units.values()].map((u) => ({ ...u }));
    return agencyId ? all.filter((u) => u.agencyId === agencyId) : all;
  }

  async reserve(id: string, at: string): Promise<boolean> {
    const u = this.units.get(id);
    if (!u || u.status !== "available") return false;
    u.status = "assigned";
    u.updatedAt = at;
    return true;
  }

  async release(id: string, at: string): Promise<boolean> {
    const u = this.units.get(id);
    if (!u || u.status !== "assigned") return false;
    u.status = "available";
    u.updatedAt = at;
    return true;
  }

  async setLocation(id: string, location: GeoPoint, at: string): Promise<Unit | null> {
    const u = this.units.get(id);
    if (!u) return null;
    u.location = { ...location };
    u.updatedAt = at;
    return { ...u };
  }
}
