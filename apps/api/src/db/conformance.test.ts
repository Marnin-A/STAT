import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { VersionConflictError } from "../shared/errors.js";
import type { DomainEvent } from "../shared/event.js";
import { InMemoryEventStore, type EventStore } from "../incident/event-store.js";
import { InMemoryRateLimitStore, type RateLimitStore } from "../incident/rate-limit.js";
import { InMemoryIdempotencyStore, type IdempotencyStore } from "../shared/idempotency.js";
import { InMemoryUnitRegistry, type Unit, type UnitRegistry } from "../dispatch/unit-registry.js";
import {
  InMemoryDispatchStore,
  type DispatchRecord,
  type DispatchStore,
} from "../dispatch/dispatch-store.js";
import {
  InMemoryHospitalRegistry,
  type Hospital,
  type HospitalRegistry,
} from "../hospital/registry.js";
import { InMemoryAccessLog, type AccessLog } from "../audit/access-log.js";
import {
  PgAccessLog,
  PgDispatchStore,
  PgEventStore,
  PgHospitalRegistry,
  PgIdempotencyStore,
  PgRateLimitStore,
  PgUnitRegistry,
} from "./adapters.js";
import { createPool, type Pool } from "./pool.js";

/**
 * Port conformance.
 *
 * The domain is written against ports, and the whole persistence swap rests on
 * one assumption: `Pg*` behaves exactly like `InMemory*`. This file is that
 * assumption written down. Every assertion runs twice — once per adapter — so
 * a divergence shows up here rather than in production.
 *
 * The Postgres half needs `TEST_DATABASE_URL`. Without it the suite skips, so
 * CI without secrets still runs the in-memory half as a full gate. Point it at
 * a dedicated database or schema: **the setup truncates every table**.
 */

const TEST_DB = process.env.TEST_DATABASE_URL;
const AGENCY = "agency-conformance";

const MIGRATION = fileURLToPath(
  new URL("../../supabase/migrations/20260828000001_init.sql", import.meta.url),
);

interface Ports {
  events: EventStore;
  rateLimit: RateLimitStore;
  idempotency: IdempotencyStore;
  units: UnitRegistry;
  dispatches: DispatchStore;
  hospitals: HospitalRegistry;
  audit: AccessLog;
}

function event(over: Partial<DomainEvent> = {}): DomainEvent {
  return {
    eventId: randomUUID(),
    incidentId: over.incidentId ?? randomUUID(),
    agencyId: AGENCY,
    version: 1,
    type: "SOSAccepted",
    actorId: null,
    occurredAt: "2026-08-28T10:00:00.000Z",
    recordedAt: "2026-08-28T10:00:00.100Z",
    payload: { type: "medical", priority: "critical" },
    ...over,
  };
}

function unit(over: Partial<Unit> = {}): Unit {
  return {
    id: randomUUID(),
    agencyId: AGENCY,
    type: "ambulance",
    callSign: "AMB-01",
    status: "available",
    location: { lat: 6.5244, lng: 3.3792 },
    capabilities: ["ALS"],
    updatedAt: "2026-08-28T10:00:00.000Z",
    ...over,
  };
}

function hospital(over: Partial<Hospital> = {}): Hospital {
  return {
    id: randomUUID(),
    name: "LUTH",
    location: { lat: 6.5175, lng: 3.3619 },
    capabilities: ["cardiac"],
    availableBeds: 8,
    webhookUrl: null,
    updatedAt: "2026-08-28T10:00:00.000Z",
    ...over,
  };
}

function dispatch(over: Partial<DispatchRecord> = {}): DispatchRecord {
  return {
    id: randomUUID(),
    incidentId: randomUUID(),
    unitId: randomUUID(),
    agencyId: AGENCY,
    dispatcherId: "d1",
    responderId: null,
    status: "pending",
    createdAt: "2026-08-28T10:00:00.000Z",
    updatedAt: "2026-08-28T10:00:00.000Z",
    ...over,
  };
}

/** The suite both adapters must satisfy identically. */
function conformanceSuite(name: string, makePorts: () => Promise<Ports> | Ports) {
  describe(name, () => {
    let ports: Ports;

    beforeEach(async () => {
      ports = await makePorts();
    });

    // ---------------------------------------------------------- event store

    it("appends a stream and reads it back in order", async () => {
      const incidentId = randomUUID();
      await ports.events.put(event({ incidentId, version: 1 }), 0);
      await ports.events.put(
        event({ incidentId, version: 2, type: "IncidentStatusChanged" }),
        1,
      );

      const log = await ports.events.load(incidentId);

      expect(log.map((e) => e.version)).toEqual([1, 2]);
      expect(log[0]!.type).toBe("SOSAccepted");
      expect(log[0]!.payload).toMatchObject({ type: "medical" });
      expect(await ports.events.currentVersion(incidentId)).toBe(2);
    });

    it("reports version 0 for a stream that does not exist", async () => {
      expect(await ports.events.currentVersion(randomUUID())).toBe(0);
      expect(await ports.events.load(randomUUID())).toEqual([]);
    });

    it("rejects an append at a version already taken", async () => {
      const incidentId = randomUUID();
      await ports.events.put(event({ incidentId, version: 1 }), 0);

      // Second writer still thinks the stream is empty.
      await expect(ports.events.put(event({ incidentId, version: 1 }), 0)).rejects.toBeInstanceOf(
        VersionConflictError,
      );
    });

    it("lists the incidents it holds", async () => {
      const a = randomUUID();
      const b = randomUUID();
      await ports.events.put(event({ incidentId: a, version: 1 }), 0);
      await ports.events.put(event({ incidentId: b, version: 1 }), 0);

      expect((await ports.events.incidentIds()).sort()).toEqual([a, b].sort());
    });

    it("redacts expired telemetry payloads without removing the events", async () => {
      const incidentId = randomUUID();
      await ports.events.put(event({ incidentId, version: 1 }), 0);
      await ports.events.put(
        event({
          incidentId,
          version: 2,
          type: "TelemetryRecorded",
          payload: { kind: "vitals", capturedAt: "2026-01-01T00:00:00.000Z", payload: { hr: 80 } },
        }),
        1,
      );
      await ports.events.put(
        event({
          incidentId,
          version: 3,
          type: "TelemetryRecorded",
          payload: { kind: "vitals", capturedAt: "2026-08-01T00:00:00.000Z", payload: { hr: 90 } },
        }),
        2,
      );

      const cutoff = "2026-06-01T00:00:00.000Z";
      expect(await ports.events.redactTelemetryBefore!(cutoff)).toBe(1);
      // Idempotent: a nightly job must not keep reporting the same work.
      expect(await ports.events.redactTelemetryBefore!(cutoff)).toBe(0);

      const log = await ports.events.load(incidentId);

      // Versions stay contiguous — projections fold over this sequence.
      expect(log.map((e) => e.version)).toEqual([1, 2, 3]);
      expect(log[1]!.payload).toEqual({});
      expect(log[2]!.payload).toMatchObject({ payload: { hr: 90 } });
    });

    // ---------------------------------------------------------- rate limits

    it("counts hits per key independently", async () => {
      expect(await ports.rateLimit.hitCount("device:1")).toBe(0);

      await ports.rateLimit.record("device:1");
      await ports.rateLimit.record("device:1");
      await ports.rateLimit.record("ip:2");

      expect(await ports.rateLimit.hitCount("device:1")).toBe(2);
      expect(await ports.rateLimit.hitCount("ip:2")).toBe(1);
    });

    // ---------------------------------------------------------- idempotency

    it("returns undefined for an unseen key and the stored value after", async () => {
      expect(await ports.idempotency.get("k1")).toBeUndefined();

      await ports.idempotency.set("k1", { id: "inc-1", version: 1 });

      expect(await ports.idempotency.get("k1")).toMatchObject({ id: "inc-1", version: 1 });
    });

    it("keeps the first response when the same key is written twice", async () => {
      // A duplicate in flight must not overwrite what the first caller got.
      await ports.idempotency.set("k1", { id: "first" });
      await ports.idempotency.set("k1", { id: "second" });

      expect(await ports.idempotency.get("k1")).toMatchObject({ id: "first" });
    });

    // ----------------------------------------------------------------- units

    it("round-trips a unit including location and capabilities", async () => {
      const u = unit();
      await ports.units.upsert(u);

      const found = await ports.units.get(u.id);

      expect(found).toMatchObject({
        id: u.id,
        agencyId: AGENCY,
        type: "ambulance",
        callSign: "AMB-01",
        status: "available",
        capabilities: ["ALS"],
      });
      expect(found!.location!.lat).toBeCloseTo(6.5244, 4);
      expect(found!.location!.lng).toBeCloseTo(3.3792, 4);
    });

    it("returns null for a unit that does not exist", async () => {
      expect(await ports.units.get(randomUUID())).toBeNull();
    });

    it("reserves an available unit exactly once", async () => {
      const u = unit();
      await ports.units.upsert(u);

      const first = await ports.units.reserve(u.id, "2026-08-28T10:05:00.000Z");
      const second = await ports.units.reserve(u.id, "2026-08-28T10:05:01.000Z");

      // This is the invariant that stops double assignment.
      expect(first).toBe(true);
      expect(second).toBe(false);
      expect((await ports.units.get(u.id))!.status).toBe("assigned");
    });

    it("releases only a unit that was assigned", async () => {
      const u = unit();
      await ports.units.upsert(u);

      expect(await ports.units.release(u.id, "2026-08-28T10:06:00.000Z")).toBe(false);

      await ports.units.reserve(u.id, "2026-08-28T10:05:00.000Z");

      expect(await ports.units.release(u.id, "2026-08-28T10:06:00.000Z")).toBe(true);
      expect((await ports.units.get(u.id))!.status).toBe("available");
    });

    it("updates a unit location", async () => {
      const u = unit();
      await ports.units.upsert(u);

      const moved = await ports.units.setLocation(
        u.id,
        { lat: 6.6018, lng: 3.3515 },
        "2026-08-28T10:07:00.000Z",
      );

      expect(moved!.location!.lat).toBeCloseTo(6.6018, 4);
      expect(moved!.location!.lng).toBeCloseTo(3.3515, 4);
    });

    it("returns null when moving a unit that does not exist", async () => {
      expect(
        await ports.units.setLocation(randomUUID(), { lat: 1, lng: 1 }, "2026-08-28T10:07:00.000Z"),
      ).toBeNull();
    });

    it("scopes the unit list by agency", async () => {
      await ports.units.upsert(unit({ callSign: "AMB-01" }));
      await ports.units.upsert(unit({ agencyId: "agency-other", callSign: "POL-01", type: "police" }));

      expect(await ports.units.list(AGENCY)).toHaveLength(1);
      expect(await ports.units.list()).toHaveLength(2);
    });

    // ------------------------------------------------------------ dispatches

    it("round-trips a dispatch and updates it in place", async () => {
      const u = unit();
      await ports.units.upsert(u);
      const record = dispatch({ unitId: u.id });
      await ports.dispatches.put(record);

      expect(await ports.dispatches.get(record.id)).toMatchObject({
        id: record.id,
        status: "pending",
        responderId: null,
      });

      await ports.dispatches.put({
        ...record,
        status: "accepted",
        responderId: "r1",
        updatedAt: "2026-08-28T10:10:00.000Z",
      });

      expect(await ports.dispatches.get(record.id)).toMatchObject({
        status: "accepted",
        responderId: "r1",
      });
    });

    it("lists dispatches for one incident", async () => {
      const u = unit();
      await ports.units.upsert(u);
      const incidentId = randomUUID();

      await ports.dispatches.put(dispatch({ incidentId, unitId: u.id }));
      await ports.dispatches.put(dispatch({ unitId: u.id }));

      expect(await ports.dispatches.listByIncident(incidentId)).toHaveLength(1);
    });

    // ------------------------------------------------------------- hospitals

    it("round-trips a hospital, webhook included server-side", async () => {
      const h = hospital({ webhookUrl: "https://hospital.example/hook" });
      await ports.hospitals.upsert(h);

      const found = await ports.hospitals.get(h.id);

      expect(found).toMatchObject({
        name: "LUTH",
        capabilities: ["cardiac"],
        availableBeds: 8,
        webhookUrl: "https://hospital.example/hook",
      });
      expect(found!.location.lat).toBeCloseTo(6.5175, 4);
    });

    it("lists hospitals", async () => {
      await ports.hospitals.upsert(hospital());
      await ports.hospitals.upsert(hospital({ name: "Reddington" }));

      expect(await ports.hospitals.list()).toHaveLength(2);
    });

    // ----------------------------------------------------------- PHI audit

    it("records and filters PHI access", async () => {
      const incidentId = randomUUID();
      await ports.audit.record({
        actorId: "r1",
        role: "responder",
        incidentId,
        resource: "vitals",
        at: "2026-08-28T10:00:00.000Z",
      });
      await ports.audit.record({
        actorId: "h1",
        role: "hospital_staff",
        incidentId: randomUUID(),
        resource: "handoff",
        at: "2026-08-28T10:01:00.000Z",
      });

      expect(await ports.audit.list(incidentId)).toHaveLength(1);
      expect(await ports.audit.list()).toHaveLength(2);
    });
  });
}

// ------------------------------------------------------------- in-memory

conformanceSuite("InMemory ports", () => ({
  events: new InMemoryEventStore(),
  rateLimit: new InMemoryRateLimitStore(),
  idempotency: new InMemoryIdempotencyStore(),
  units: new InMemoryUnitRegistry(),
  dispatches: new InMemoryDispatchStore(),
  hospitals: new InMemoryHospitalRegistry(),
  audit: new InMemoryAccessLog(),
}));

// -------------------------------------------------------------- postgres

describe.skipIf(!TEST_DB)("Postgres ports", () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = createPool(TEST_DB!);
    await pool.query(readFileSync(MIGRATION, "utf8"));
    await pool.query(
      `insert into agencies (id, name, type) values ($1, 'Conformance', 'medical'),
         ('agency-other', 'Other', 'police')
       on conflict (id) do nothing`,
      [AGENCY],
    );
  }, 60_000);

  afterAll(async () => {
    await pool?.end();
  });

  conformanceSuite("adapters", async () => {
    // Truncate rather than drop: the schema and agencies survive, the data
    // does not, so every test starts from the same place either adapter does.
    await pool.query(
      `truncate incident_events, sos_rate_limit, idempotency_keys,
                dispatches, units, hospitals, phi_access_log restart identity cascade`,
    );
    return {
      events: new PgEventStore(pool),
      rateLimit: new PgRateLimitStore(pool),
      idempotency: new PgIdempotencyStore(pool),
      units: new PgUnitRegistry(pool),
      dispatches: new PgDispatchStore(pool),
      hospitals: new PgHospitalRegistry(pool),
      audit: new PgAccessLog(pool),
    };
  });
});
