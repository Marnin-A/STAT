import { describe, it, expect } from "vitest";
import { haversineKm, rankAvailableUnits } from "./availability.js";
import type { Unit } from "./unit-registry.js";

const at = "2026-07-02T10:00:00.000Z";

function unit(over: Partial<Unit>): Unit {
  return {
    id: "u1",
    agencyId: "agency-1",
    type: "medical",
    callSign: "M-1",
    status: "available",
    location: { lat: 6.5, lng: 3.4 },
    updatedAt: at,
    ...over,
  };
}

describe("haversineKm", () => {
  it("returns 0 for identical points", () => {
    expect(haversineKm({ lat: 6.5, lng: 3.4 }, { lat: 6.5, lng: 3.4 })).toBe(0);
  });

  it("Lagos -> Ibadan roughly 128 km", () => {
    const d = haversineKm({ lat: 6.5244, lng: 3.3792 }, { lat: 7.3775, lng: 3.947 });
    expect(d).toBeGreaterThan(110);
    expect(d).toBeLessThan(140);
  });
});

describe("rankAvailableUnits", () => {
  const incident = { lat: 6.5, lng: 3.4 };

  it("excludes non-available units and units without location", () => {
    const ranked = rankAvailableUnits(
      [
        unit({ id: "busy", status: "assigned" }),
        unit({ id: "dark", location: null }),
        unit({ id: "ok" }),
      ],
      { location: incident },
    );
    expect(ranked.map((u) => u.id)).toEqual(["ok"]);
  });

  it("filters by unit type when requested", () => {
    const ranked = rankAvailableUnits(
      [unit({ id: "med", type: "medical" }), unit({ id: "fire", type: "fire" })],
      { location: incident, type: "fire" },
    );
    expect(ranked.map((u) => u.id)).toEqual(["fire"]);
  });

  it("orders by distance, nearest first", () => {
    const ranked = rankAvailableUnits(
      [
        unit({ id: "far", location: { lat: 7.0, lng: 3.4 } }),
        unit({ id: "near", location: { lat: 6.51, lng: 3.4 } }),
      ],
      { location: incident },
    );
    expect(ranked.map((u) => u.id)).toEqual(["near", "far"]);
    expect(ranked[0]!.distanceKm).toBeLessThan(ranked[1]!.distanceKm);
  });

  it("prefers same-agency unit over nearer other-agency unit", () => {
    const ranked = rankAvailableUnits(
      [
        unit({ id: "other-near", agencyId: "agency-2", location: { lat: 6.505, lng: 3.4 } }),
        unit({ id: "own-far", agencyId: "agency-1", location: { lat: 6.55, lng: 3.4 } }),
      ],
      { location: incident, agencyId: "agency-1" },
    );
    expect(ranked[0]!.id).toBe("own-far");
  });

  it("computes a positive ETA and respects limit", () => {
    const ranked = rankAvailableUnits(
      [
        unit({ id: "a", location: { lat: 6.51, lng: 3.4 } }),
        unit({ id: "b", location: { lat: 6.52, lng: 3.4 } }),
        unit({ id: "c", location: { lat: 6.53, lng: 3.4 } }),
      ],
      { location: incident, limit: 2 },
    );
    expect(ranked).toHaveLength(2);
    expect(ranked[0]!.etaMinutes).toBeGreaterThan(0);
  });
});
