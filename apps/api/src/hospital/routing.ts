import type { GeoPoint } from "@stat/shared";
import { haversineKm } from "../dispatch/availability.js";
import type { Hospital } from "./registry.js";

export interface HospitalQuery {
  location: GeoPoint;
  capability?: string;
  limit?: number;
}

export interface RankedHospital extends Hospital {
  distanceKm: number;
}

// v1 routing: hard-filter capability + free beds, nearest first. Specialty
// scoring / diversion status are future work (see future-features.md).
export function rankHospitals(hospitals: Hospital[], q: HospitalQuery): RankedHospital[] {
  const ranked = hospitals
    .filter((h) => h.availableBeds > 0)
    .filter((h) => !q.capability || h.capabilities.includes(q.capability))
    .map((h) => ({ ...h, distanceKm: haversineKm(h.location, q.location) }))
    .sort((a, b) => a.distanceKm - b.distanceKm);
  return q.limit ? ranked.slice(0, q.limit) : ranked;
}
