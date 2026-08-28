import type { GeoPoint, UnitStatus, UnitType } from "@stat/shared";
import type { DomainEvent } from "../shared/event.js";
import { VersionConflictError } from "../shared/errors.js";
import type { EventStore } from "../incident/event-store.js";
import type { RateLimitStore } from "../incident/rate-limit.js";
import type { IdempotencyStore } from "../shared/idempotency.js";
import type { Unit, UnitRegistry } from "../dispatch/unit-registry.js";
import type { DispatchRecord, DispatchStore } from "../dispatch/dispatch-store.js";
import type { Hospital, HospitalRegistry } from "../hospital/registry.js";
import type { AccessEntry, AccessLog } from "../audit/access-log.js";
import { isUniqueViolation, type Pool } from "./pool.js";

/**
 * Postgres implementations of every port.
 *
 * Each one is a drop-in for the `InMemory*` class it mirrors — same interface,
 * same invariants. `conformance.test.ts` runs one suite against both so a
 * behavioural difference between them is a test failure, not a production
 * surprise.
 */

// ------------------------------------------------------------------ helpers

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/** PostGIS stores lng/lat; the domain speaks lat/lng. Never invert this. */
function pointLiteral(p: GeoPoint): string {
  return `SRID=4326;POINT(${p.lng} ${p.lat})`;
}

interface PointRow {
  lat: number | null;
  lng: number | null;
}

function toPoint(row: PointRow): GeoPoint | null {
  return row.lat === null || row.lng === null ? null : { lat: Number(row.lat), lng: Number(row.lng) };
}

// --------------------------------------------------------------- event store

interface EventRow {
  id: string;
  incident_id: string;
  agency_id: string;
  version: number;
  type: string;
  actor_id: string | null;
  occurred_at: Date;
  recorded_at: Date;
  payload: Record<string, unknown>;
}

function toEvent(r: EventRow): DomainEvent {
  return {
    eventId: r.id,
    incidentId: r.incident_id,
    agencyId: r.agency_id,
    version: r.version,
    type: r.type,
    actorId: r.actor_id,
    occurredAt: toIso(r.occurred_at),
    recordedAt: toIso(r.recorded_at),
    payload: r.payload,
  };
}

export class PgEventStore implements EventStore {
  constructor(private readonly pool: Pool) {}

  async currentVersion(incidentId: string): Promise<number> {
    const { rows } = await this.pool.query<{ version: number | null }>(
      `select max(version) as version from incident_events where incident_id = $1`,
      [incidentId],
    );
    return rows[0]?.version ?? 0;
  }

  /**
   * The UNIQUE (incident_id, version) constraint is the lock. Two concurrent
   * appends at the same version: one commits, the other gets 23505 and becomes
   * a VersionConflictError — the same outcome the in-memory store produces by
   * comparing lengths, but without the race.
   */
  async put(event: DomainEvent, expectedVersion: number): Promise<void> {
    if (event.version !== expectedVersion + 1) {
      throw new VersionConflictError(expectedVersion, event.version - 1);
    }
    try {
      await this.pool.query(
        `insert into incident_events
           (id, incident_id, agency_id, version, type, actor_id, occurred_at, recorded_at, payload)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          event.eventId,
          event.incidentId,
          event.agencyId,
          event.version,
          event.type,
          event.actorId,
          event.occurredAt,
          event.recordedAt,
          JSON.stringify(event.payload),
        ],
      );
    } catch (err) {
      if (isUniqueViolation(err)) {
        throw new VersionConflictError(expectedVersion, await this.currentVersion(event.incidentId));
      }
      throw err;
    }
  }

  async load(incidentId: string): Promise<DomainEvent[]> {
    const { rows } = await this.pool.query<EventRow>(
      `select * from incident_events where incident_id = $1 order by version asc`,
      [incidentId],
    );
    return rows.map(toEvent);
  }

  async incidentIds(): Promise<string[]> {
    const { rows } = await this.pool.query<{ incident_id: string }>(
      `select distinct incident_id from incident_events`,
    );
    return rows.map((r) => r.incident_id);
  }

  /**
   * Every stream for one agency in a single query.
   *
   * `list()` on the service would otherwise be one round trip per incident.
   * A projection table is the next optimisation; folding is correct today and
   * cannot drift from the log.
   */
  async loadByAgency(agencyId: string | null): Promise<Map<string, DomainEvent[]>> {
    const { rows } = agencyId
      ? await this.pool.query<EventRow>(
          `select * from incident_events where agency_id = $1 order by incident_id, version asc`,
          [agencyId],
        )
      : await this.pool.query<EventRow>(
          `select * from incident_events order by incident_id, version asc`,
        );

    const streams = new Map<string, DomainEvent[]>();
    for (const row of rows) {
      const stream = streams.get(row.incident_id) ?? [];
      stream.push(toEvent(row));
      streams.set(row.incident_id, stream);
    }
    return streams;
  }
}

// ---------------------------------------------------------------- rate limit

export class PgRateLimitStore implements RateLimitStore {
  constructor(private readonly pool: Pool) {}

  async hitCount(key: string): Promise<number> {
    const { rows } = await this.pool.query<{ count: number }>(
      `select count from sos_rate_limit where key = $1`,
      [key],
    );
    return rows[0]?.count ?? 0;
  }

  async record(key: string): Promise<void> {
    await this.pool.query(
      `insert into sos_rate_limit (key, count) values ($1, 1)
       on conflict (key) do update set count = sos_rate_limit.count + 1`,
      [key],
    );
  }
}

// --------------------------------------------------------------- idempotency

export class PgIdempotencyStore implements IdempotencyStore {
  constructor(private readonly pool: Pool) {}

  async get(key: string): Promise<unknown | undefined> {
    const { rows } = await this.pool.query<{ response: unknown }>(
      `select response from idempotency_keys where key = $1`,
      [key],
    );
    return rows[0]?.response;
  }

  async set(key: string, value: unknown): Promise<void> {
    // First write wins: a concurrent duplicate must not overwrite the response
    // the first caller already received.
    await this.pool.query(
      `insert into idempotency_keys (key, response) values ($1, $2)
       on conflict (key) do nothing`,
      [key, JSON.stringify(value)],
    );
  }
}

// --------------------------------------------------------------------- units

interface UnitRow extends PointRow {
  id: string;
  agency_id: string;
  type: UnitType;
  call_sign: string;
  status: UnitStatus;
  capabilities: string[];
  updated_at: Date;
}

const UNIT_COLUMNS = `id, agency_id, type, call_sign, status, capabilities, updated_at,
  st_y(location::geometry) as lat, st_x(location::geometry) as lng`;

function toUnit(r: UnitRow): Unit {
  return {
    id: r.id,
    agencyId: r.agency_id,
    type: r.type,
    callSign: r.call_sign,
    status: r.status,
    location: toPoint(r),
    capabilities: r.capabilities,
    updatedAt: toIso(r.updated_at),
  };
}

export class PgUnitRegistry implements UnitRegistry {
  constructor(private readonly pool: Pool) {}

  async upsert(unit: Unit): Promise<void> {
    await this.pool.query(
      `insert into units (id, agency_id, type, call_sign, status, location, capabilities, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       on conflict (id) do update set
         agency_id = excluded.agency_id, type = excluded.type,
         call_sign = excluded.call_sign, status = excluded.status,
         location = excluded.location, capabilities = excluded.capabilities,
         updated_at = excluded.updated_at`,
      [
        unit.id,
        unit.agencyId,
        unit.type,
        unit.callSign,
        unit.status,
        unit.location ? pointLiteral(unit.location) : null,
        unit.capabilities,
        unit.updatedAt,
      ],
    );
  }

  async get(id: string): Promise<Unit | null> {
    const { rows } = await this.pool.query<UnitRow>(
      `select ${UNIT_COLUMNS} from units where id = $1`,
      [id],
    );
    return rows[0] ? toUnit(rows[0]) : null;
  }

  async list(agencyId?: string): Promise<Unit[]> {
    const { rows } = agencyId
      ? await this.pool.query<UnitRow>(
          `select ${UNIT_COLUMNS} from units where agency_id = $1`,
          [agencyId],
        )
      : await this.pool.query<UnitRow>(`select ${UNIT_COLUMNS} from units`);
    return rows.map(toUnit);
  }

  /**
   * Atomic available -> assigned.
   *
   * The status predicate is inside the UPDATE, so two dispatchers racing for
   * the same unit produce exactly one rowCount of 1. This is what stops double
   * assignment; never split it into a read then a write.
   */
  async reserve(id: string, at: string): Promise<boolean> {
    const res = await this.pool.query(
      `update units set status = 'assigned', updated_at = $2
       where id = $1 and status = 'available'`,
      [id, at],
    );
    return res.rowCount === 1;
  }

  async release(id: string, at: string): Promise<boolean> {
    const res = await this.pool.query(
      `update units set status = 'available', updated_at = $2
       where id = $1 and status = 'assigned'`,
      [id, at],
    );
    return res.rowCount === 1;
  }

  async setLocation(id: string, location: GeoPoint, at: string): Promise<Unit | null> {
    const { rows } = await this.pool.query<UnitRow>(
      `update units set location = $2, updated_at = $3 where id = $1
       returning ${UNIT_COLUMNS}`,
      [id, pointLiteral(location), at],
    );
    return rows[0] ? toUnit(rows[0]) : null;
  }
}

// ---------------------------------------------------------------- dispatches

interface DispatchRow {
  id: string;
  incident_id: string;
  unit_id: string;
  agency_id: string;
  dispatcher_id: string;
  responder_id: string | null;
  status: DispatchRecord["status"];
  created_at: Date;
  updated_at: Date;
}

function toDispatch(r: DispatchRow): DispatchRecord {
  return {
    id: r.id,
    incidentId: r.incident_id,
    unitId: r.unit_id,
    agencyId: r.agency_id,
    dispatcherId: r.dispatcher_id,
    responderId: r.responder_id,
    status: r.status,
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
  };
}

export class PgDispatchStore implements DispatchStore {
  constructor(private readonly pool: Pool) {}

  async put(record: DispatchRecord): Promise<void> {
    await this.pool.query(
      `insert into dispatches
         (id, incident_id, unit_id, agency_id, dispatcher_id, responder_id, status, created_at, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       on conflict (id) do update set
         responder_id = excluded.responder_id, status = excluded.status,
         updated_at = excluded.updated_at`,
      [
        record.id,
        record.incidentId,
        record.unitId,
        record.agencyId,
        record.dispatcherId,
        record.responderId,
        record.status,
        record.createdAt,
        record.updatedAt,
      ],
    );
  }

  async get(id: string): Promise<DispatchRecord | null> {
    const { rows } = await this.pool.query<DispatchRow>(`select * from dispatches where id = $1`, [
      id,
    ]);
    return rows[0] ? toDispatch(rows[0]) : null;
  }

  async listByIncident(incidentId: string): Promise<DispatchRecord[]> {
    const { rows } = await this.pool.query<DispatchRow>(
      `select * from dispatches where incident_id = $1 order by created_at asc`,
      [incidentId],
    );
    return rows.map(toDispatch);
  }
}

// ----------------------------------------------------------------- hospitals

interface HospitalRow extends PointRow {
  id: string;
  name: string;
  capabilities: string[];
  available_beds: number;
  webhook_url: string | null;
  updated_at: Date;
}

const HOSPITAL_COLUMNS = `id, name, capabilities, available_beds, webhook_url, updated_at,
  st_y(location::geometry) as lat, st_x(location::geometry) as lng`;

function toHospital(r: HospitalRow): Hospital {
  return {
    id: r.id,
    name: r.name,
    location: toPoint(r) ?? { lat: 0, lng: 0 },
    capabilities: r.capabilities,
    availableBeds: r.available_beds,
    webhookUrl: r.webhook_url,
    updatedAt: toIso(r.updated_at),
  };
}

export class PgHospitalRegistry implements HospitalRegistry {
  constructor(private readonly pool: Pool) {}

  async upsert(hospital: Hospital): Promise<void> {
    await this.pool.query(
      `insert into hospitals
         (id, name, location, capabilities, available_beds, webhook_url, updated_at)
       values ($1, $2, $3, $4, $5, $6, $7)
       on conflict (id) do update set
         name = excluded.name, location = excluded.location,
         capabilities = excluded.capabilities, available_beds = excluded.available_beds,
         webhook_url = excluded.webhook_url, updated_at = excluded.updated_at`,
      [
        hospital.id,
        hospital.name,
        pointLiteral(hospital.location),
        hospital.capabilities,
        hospital.availableBeds,
        hospital.webhookUrl,
        hospital.updatedAt,
      ],
    );
  }

  async get(id: string): Promise<Hospital | null> {
    const { rows } = await this.pool.query<HospitalRow>(
      `select ${HOSPITAL_COLUMNS} from hospitals where id = $1`,
      [id],
    );
    return rows[0] ? toHospital(rows[0]) : null;
  }

  async list(): Promise<Hospital[]> {
    const { rows } = await this.pool.query<HospitalRow>(
      `select ${HOSPITAL_COLUMNS} from hospitals`,
    );
    return rows.map(toHospital);
  }
}

// ---------------------------------------------------------------- PHI audit

interface AccessRow {
  actor_id: string;
  role: string;
  incident_id: string;
  resource: AccessEntry["resource"];
  at: Date;
}

export class PgAccessLog implements AccessLog {
  constructor(private readonly pool: Pool) {}

  async record(entry: AccessEntry): Promise<void> {
    await this.pool.query(
      `insert into phi_access_log (actor_id, role, incident_id, resource, at)
       values ($1, $2, $3, $4, $5)`,
      [entry.actorId, entry.role, entry.incidentId, entry.resource, entry.at],
    );
  }

  async list(incidentId?: string): Promise<AccessEntry[]> {
    const { rows } = incidentId
      ? await this.pool.query<AccessRow>(
          `select * from phi_access_log where incident_id = $1 order by at asc`,
          [incidentId],
        )
      : await this.pool.query<AccessRow>(`select * from phi_access_log order by at asc`);

    return rows.map((r) => ({
      actorId: r.actor_id,
      role: r.role as AccessEntry["role"],
      incidentId: r.incident_id,
      resource: r.resource,
      at: toIso(r.at),
    }));
  }
}
