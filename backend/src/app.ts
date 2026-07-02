import Fastify, { type FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import type { Clock, IdGen } from "./shared/event.js";
import { DomainError, BadRequestError, NotFoundError } from "./shared/errors.js";
import { InMemoryIdempotencyStore, type IdempotencyStore } from "./shared/idempotency.js";
import { InMemoryEventStore } from "./incident/event-store.js";
import { InMemoryRateLimitStore } from "./incident/rate-limit.js";
import { IncidentService } from "./incident/service.js";
import type { IncidentStatus } from "./incident/state-machine.js";
import { DispatchService } from "./dispatch/service.js";
import { InMemoryUnitRegistry, type Unit, type UnitRegistry, type UnitType } from "./dispatch/unit-registry.js";
import { InMemoryDispatchStore } from "./dispatch/dispatch-store.js";
import { rankAvailableUnits } from "./dispatch/availability.js";
import {
  resolvePrincipal,
  requireAuthenticated,
  assertRole,
  assertAgencyAccess,
} from "./identity/auth.js";

export interface AppDeps {
  incidents: IncidentService;
  dispatch: DispatchService;
  units: UnitRegistry;
  idempotency: IdempotencyStore;
  idGen: IdGen;
  clock: Clock;
}

// Wire default in-memory deps (Phase 1/2). Supabase/Redis impls swap in here.
export function defaultDeps(idGen: IdGen = randomUUID, clock: Clock = () => new Date().toISOString()): AppDeps {
  const events = new InMemoryEventStore();
  const incidents = new IncidentService(events, new InMemoryRateLimitStore(), idGen, clock);
  const units = new InMemoryUnitRegistry();
  return {
    incidents,
    dispatch: new DispatchService(events, units, new InMemoryDispatchStore(), incidents, idGen, clock),
    units,
    idempotency: new InMemoryIdempotencyStore(),
    idGen,
    clock,
  };
}

const UNIT_TYPES: ReadonlySet<string> = new Set(["medical", "security", "fire"]);

export function buildApp(deps: AppDeps = defaultDeps()): FastifyInstance {
  const app = Fastify({ logger: false });
  const { incidents, dispatch, units, idempotency, idGen, clock } = deps;

  app.setErrorHandler((err, _req, reply) => {
    if (err instanceof DomainError) {
      return reply.status(err.statusCode).send({ error: err.code, message: err.message });
    }
    return reply.status(500).send({ error: "INTERNAL", message: "internal error" });
  });

  // POST /incidents — create from SOS. Anonymous citizen allowed.
  app.post("/incidents", async (req, reply) => {
    const principal = resolvePrincipal(req.headers);
    const key = req.headers["idempotency-key"] as string | undefined;
    if (!key) throw new BadRequestError("Idempotency-Key header required");

    const scoped = `${principal.userId ?? "anon"}:POST /incidents:${key}`;
    const cached = await idempotency.get(scoped);
    if (cached) return reply.status(201).send(cached);

    const b = (req.body ?? {}) as Record<string, unknown>;
    if (!b.type || !b.priority || !b.deviceId) {
      throw new BadRequestError("type, priority, deviceId required");
    }

    const result = await incidents.createSos({
      agencyId: typeof b.agencyId === "string" ? b.agencyId : "unassigned",
      type: String(b.type),
      priority: String(b.priority),
      location: (b.location as { lat: number; lng: number } | null) ?? null,
      reporterId: principal.userId,
      deviceId: String(b.deviceId),
      ip: req.ip,
      occurredAt: typeof b.occurredAt === "string" ? b.occurredAt : new Date().toISOString(),
    });

    await idempotency.set(scoped, result);
    return reply.status(201).send(result);
  });

  // GET /incidents?status= — agency-scoped list.
  app.get("/incidents", async (req, reply) => {
    const principal = resolvePrincipal(req.headers);
    requireAuthenticated(principal);
    const status = (req.query as Record<string, string>).status as IncidentStatus | undefined;
    const scope = principal.role === "admin" ? null : principal.agencyId;
    const list = await incidents.list(scope, status);
    return reply.send(list);
  });

  // GET /incidents/:id — read model.
  app.get("/incidents/:id", async (req, reply) => {
    const principal = resolvePrincipal(req.headers);
    requireAuthenticated(principal);
    const { id } = req.params as { id: string };
    const rm = await incidents.get(id);
    if (!rm) throw new NotFoundError("incident not found");
    assertAgencyAccess(principal, rm);
    return reply.send(rm);
  });

  // POST /incidents/:id/status — transition. Dispatcher/responder/admin only.
  app.post("/incidents/:id/status", async (req, reply) => {
    const principal = resolvePrincipal(req.headers);
    requireAuthenticated(principal);
    assertRole(principal, ["dispatcher", "responder", "admin"]);

    const { id } = req.params as { id: string };
    const rm = await incidents.get(id);
    if (!rm) throw new NotFoundError("incident not found");
    assertAgencyAccess(principal, rm);

    const b = (req.body ?? {}) as Record<string, unknown>;
    if (!b.status || typeof b.expectedVersion !== "number") {
      throw new BadRequestError("status and expectedVersion required");
    }

    await incidents.changeStatus(
      id,
      b.status as IncidentStatus,
      b.expectedVersion,
      principal.userId!,
    );
    return reply.send(await incidents.get(id));
  });

  // POST /units — register/replace a unit. Dispatcher/admin only.
  app.post("/units", async (req, reply) => {
    const principal = resolvePrincipal(req.headers);
    requireAuthenticated(principal);
    assertRole(principal, ["dispatcher", "admin"]);

    const b = (req.body ?? {}) as Record<string, unknown>;
    if (!b.agencyId || !b.callSign || typeof b.type !== "string" || !UNIT_TYPES.has(b.type)) {
      throw new BadRequestError("agencyId, callSign, type (medical|security|fire) required");
    }

    const unit: Unit = {
      id: typeof b.id === "string" ? b.id : idGen(),
      agencyId: String(b.agencyId),
      type: b.type as UnitType,
      callSign: String(b.callSign),
      status: "available",
      location: (b.location as { lat: number; lng: number } | null) ?? null,
      updatedAt: clock(),
    };
    await units.upsert(unit);
    return reply.status(201).send(unit);
  });

  // POST /units/:id/location — responder GPS ping.
  app.post("/units/:id/location", async (req, reply) => {
    const principal = resolvePrincipal(req.headers);
    requireAuthenticated(principal);
    assertRole(principal, ["responder", "dispatcher", "admin"]);

    const { id } = req.params as { id: string };
    const b = (req.body ?? {}) as Record<string, unknown>;
    if (typeof b.lat !== "number" || typeof b.lng !== "number") {
      throw new BadRequestError("lat and lng required");
    }
    const unit = await units.setLocation(id, { lat: b.lat, lng: b.lng }, clock());
    if (!unit) throw new NotFoundError("unit not found");
    return reply.send(unit);
  });

  // GET /units/available?lat=&lng=&type=&limit= — ranked for dispatch.
  app.get("/units/available", async (req, reply) => {
    const principal = resolvePrincipal(req.headers);
    requireAuthenticated(principal);

    const q = req.query as Record<string, string>;
    const lat = Number(q.lat);
    const lng = Number(q.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestError("lat and lng query params required");
    }
    if (q.type && !UNIT_TYPES.has(q.type)) throw new BadRequestError("invalid type");

    const ranked = rankAvailableUnits(await units.list(), {
      location: { lat, lng },
      type: q.type as UnitType | undefined,
      agencyId: principal.agencyId ?? undefined,
      limit: q.limit ? Number(q.limit) : undefined,
    });
    return reply.send(ranked);
  });

  // POST /incidents/:id/dispatch — dispatcher assigns a unit.
  app.post("/incidents/:id/dispatch", async (req, reply) => {
    const principal = resolvePrincipal(req.headers);
    requireAuthenticated(principal);
    assertRole(principal, ["dispatcher", "admin"]);

    const { id } = req.params as { id: string };
    const rm = await incidents.get(id);
    if (!rm) throw new NotFoundError("incident not found");
    assertAgencyAccess(principal, rm);

    const b = (req.body ?? {}) as Record<string, unknown>;
    if (typeof b.unitId !== "string" || typeof b.expectedVersion !== "number") {
      throw new BadRequestError("unitId and expectedVersion required");
    }

    const record = await dispatch.dispatchUnit(id, b.unitId, principal.userId!, b.expectedVersion);
    return reply.status(201).send(record);
  });

  // POST /dispatches/:id/accept | /reject — responder responds to assignment.
  app.post("/dispatches/:id/accept", async (req, reply) => {
    const principal = resolvePrincipal(req.headers);
    requireAuthenticated(principal);
    assertRole(principal, ["responder", "admin"]);
    const { id } = req.params as { id: string };
    return reply.send(await dispatch.acceptDispatch(id, principal.userId!));
  });

  app.post("/dispatches/:id/reject", async (req, reply) => {
    const principal = resolvePrincipal(req.headers);
    requireAuthenticated(principal);
    assertRole(principal, ["responder", "admin"]);
    const { id } = req.params as { id: string };
    return reply.send(await dispatch.rejectDispatch(id, principal.userId!));
  });

  return app;
}

// Entry point.
const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const app = buildApp();
  const port = Number(process.env.PORT ?? 3000);
  app.listen({ port, host: "0.0.0.0" }).then(() => {
    console.log(`STAT backend listening on :${port}`);
  });
}
