import type { GeoPoint, RankedUnit, Unit, UnitType } from "@stat/shared";

export type { RankedUnit };

const EARTH_RADIUS_KM = 6371;
// v1 ETA assumes flat 40 km/h urban average; real routing is a later phase.
const AVG_SPEED_KMH = 40;

export function haversineKm(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export interface UnitQuery {
  location: GeoPoint;
  /** Empty means "no type filter"; several types means "any of these". */
  types?: readonly UnitType[];
  agencyId?: string;
  limit?: number;
}

// v1 auto-select (design decision 12): hard-filter availability + type,
// then same-agency units outrank cross-agency (mutual aid is explicit,
// decision 10), nearest first within each group.
export function rankAvailableUnits(units: Unit[], q: UnitQuery): RankedUnit[] {
  const ranked = units
    .filter((u) => u.status === "available" && u.location !== null)
    .filter((u) => !q.types?.length || q.types.includes(u.type))
    .map((u) => {
      const distanceKm = haversineKm(u.location!, q.location);
      return { ...u, distanceKm, etaMinutes: (distanceKm / AVG_SPEED_KMH) * 60 };
    })
    .sort((a, b) => {
      if (q.agencyId) {
        const own = Number(b.agencyId === q.agencyId) - Number(a.agencyId === q.agencyId);
        if (own !== 0) return own;
      }
      return a.distanceKm - b.distanceKm;
    });
  return q.limit ? ranked.slice(0, q.limit) : ranked;
}
