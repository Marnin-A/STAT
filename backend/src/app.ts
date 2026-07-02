import Fastify, { type FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
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
import { InMemoryEventBus, agencyChannel, incidentChannel, ALL_CHANNEL, type EventBus } from "./realtime/bus.js";
import { PublishingEventStore } from "./realtime/publishing-event-store.js";
import { LagMetrics } from "./realtime/lag-metrics.js";
import { TriageService } from "./triage/service.js";
import { getQuestions } from "./triage/questionnaire.js";
import type { TriageAnswer } from "./triage/scoring.js";
import { TelemetryService, type TelemetryInput } from "./telemetry/service.js";
import { ReplayService, type ReplayCommand } from "./sync/replay.js";
import { HospitalService } from "./hospital/service.js";
import { InMemoryHospitalRegistry, type Hospital, type HospitalRegistry } from "./hospital/registry.js";
import { rankHospitals } from "./hospital/routing.js";
import { InMemoryNotifier, type Notifier } from "./notification/notifier.js";
import { InMemoryAccessLog, type AccessLog } from "./audit/access-log.js";
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
  triage: TriageService;
  telemetry: TelemetryService;
  replay: ReplayService;
  hospital: HospitalService;
  hospitals: HospitalRegistry;
  notifier: Notifier;
  audit: AccessLog;
  idempotency: IdempotencyStore;
  bus: EventBus;
  lag: LagMetrics;
  idGen: IdGen;
  clock: Clock;
}

// Wire default in-memory deps (Phase 1-3). Supabase/Redis impls swap in here.
export function defaultDeps(idGen: IdGen = randomUUID, clock: Clock = () => new Date().toISOString()): AppDeps {
  const bus = new InMemoryEventBus();
  const lag = new LagMetrics();
  // Every append (SOS, status, dispatch) fans out through the bus.
  const events = new PublishingEventStore(new InMemoryEventStore(), bus, lag);
  const incidents = new IncidentService(events, new InMemoryRateLimitStore(), idGen, clock);
  const units = new InMemoryUnitRegistry();
  const triage = new TriageService(events, incidents, idGen, clock);
  const telemetry = new TelemetryService(events, incidents, idGen, clock);
  const idempotency = new InMemoryIdempotencyStore();
  const hospitals = new InMemoryHospitalRegistry();
  const notifier = new InMemoryNotifier();
  return {
    incidents,
    dispatch: new DispatchService(events, units, new InMemoryDispatchStore(), incidents, idGen, clock),
    units,
    triage,
    telemetry,
    replay: new ReplayService(incidents, triage, telemetry, events, idempotency),
    hospital: new HospitalService(events, incidents, hospitals, triage, telemetry, notifier, idGen, clock),
    hospitals,
    notifier,
    audit: new InMemoryAccessLog(),
    idempotency,
    bus,
    lag,
    idGen,
    clock,
  };
}

const UNIT_TYPES: ReadonlySet<string> = new Set(["medical", "security", "fire"]);

export function buildApp(deps: AppDeps = defaultDeps()): FastifyInstance {
  const app = Fastify({ logger: false });
  const { incidents, dispatch, units, triage, telemetry, replay, hospital, hospitals, audit, idempotency, bus, lag, idGen, clock } = deps;
  app.register(websocket);

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

  // GET /ws/incidents/:id — WebSocket incident channel. Browsers cannot set
  // headers on the WS handshake, so the auth stub reads query params here
  // (?user=&role=&agency=); Better Auth swaps in a query token later.
  // App close codes: 4001 unauthorized, 4003 forbidden, 4004 not found.
  app.register(async (scope) => {
    scope.get("/ws/incidents/:id", { websocket: true }, async (socket, req) => {
      const q = req.query as Record<string, string>;
      const principal = resolvePrincipal({
        "x-user-id": q.user,
        "x-role": q.role,
        "x-agency-id": q.agency,
      });
      if (!principal.userId) return socket.close(4001, "unauthorized");

      const { id } = req.params as { id: string };
      const rm = await incidents.get(id);
      if (!rm) return socket.close(4004, "incident not found");
      try {
        assertAgencyAccess(principal, rm);
      } catch {
        return socket.close(4003, "forbidden");
      }

      const off = bus.subscribe(incidentChannel(id), (e) => {
        socket.send(JSON.stringify(e));
      });
      socket.on("close", off);
    });
  });

  // GET /dashboard/stream — SSE feed. Agency-scoped; admin gets the firehose.
  app.get("/dashboard/stream", (req, reply) => {
    const principal = resolvePrincipal(req.headers);
    requireAuthenticated(principal);
    assertRole(principal, ["dispatcher", "hospital_staff", "admin"]);

    reply.hijack();
    reply.raw.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    });
    reply.raw.write(":connected\n\n");

    const channel =
      principal.role === "admin" || !principal.agencyId
        ? ALL_CHANNEL
        : agencyChannel(principal.agencyId);
    const off = bus.subscribe(channel, (e) => {
      reply.raw.write(`data: ${JSON.stringify(e)}\n\n`);
    });
    req.raw.on("close", () => {
      off();
      reply.raw.end();
    });
  });

  // GET /triage/questions?type= — protocol questionnaire.
  app.get("/triage/questions", async (req, reply) => {
    const principal = resolvePrincipal(req.headers);
    requireAuthenticated(principal);
    const { type } = req.query as Record<string, string>;
    if (!type) throw new BadRequestError("type query param required");
    return reply.send(getQuestions(type)); // 400 on unknown type
  });

  // POST /incidents/:id/triage — submit answers, get deterministic score.
  app.post("/incidents/:id/triage", async (req, reply) => {
    const principal = resolvePrincipal(req.headers);
    requireAuthenticated(principal);
    assertRole(principal, ["responder", "dispatcher", "admin"]);

    const { id } = req.params as { id: string };
    const rm = await incidents.get(id);
    if (!rm) throw new NotFoundError("incident not found");
    assertAgencyAccess(principal, rm);

    const b = (req.body ?? {}) as Record<string, unknown>;
    if (!Array.isArray(b.answers)) throw new BadRequestError("answers array required");
    const occurredAt = typeof b.occurredAt === "string" ? b.occurredAt : clock();

    const score = await triage.submitAnswers(id, b.answers as TriageAnswer[], principal.userId!, occurredAt);
    return reply.status(201).send(score);
  });

  // GET /incidents/:id/triage — questions + latest answers + score.
  app.get("/incidents/:id/triage", async (req, reply) => {
    const principal = resolvePrincipal(req.headers);
    requireAuthenticated(principal);
    const { id } = req.params as { id: string };
    const rm = await incidents.get(id);
    if (!rm) throw new NotFoundError("incident not found");
    assertAgencyAccess(principal, rm);
    await audit.record({ actorId: principal.userId!, role: principal.role, incidentId: id, resource: "triage", at: clock() });
    return reply.send(await triage.getTriage(id));
  });

  // POST /incidents/:id/vitals — manual telemetry entry (v1: no devices).
  app.post("/incidents/:id/vitals", async (req, reply) => {
    const principal = resolvePrincipal(req.headers);
    requireAuthenticated(principal);
    assertRole(principal, ["responder", "dispatcher", "admin"]);

    const { id } = req.params as { id: string };
    const rm = await incidents.get(id);
    if (!rm) throw new NotFoundError("incident not found");
    assertAgencyAccess(principal, rm);

    await telemetry.record(id, (req.body ?? {}) as unknown as TelemetryInput, principal.userId!);
    return reply.status(201).send({ ok: true });
  });

  // GET /incidents/:id/vitals?limit= — latest-first samples (hospital view).
  app.get("/incidents/:id/vitals", async (req, reply) => {
    const principal = resolvePrincipal(req.headers);
    requireAuthenticated(principal);
    const { id } = req.params as { id: string };
    const rm = await incidents.get(id);
    if (!rm) throw new NotFoundError("incident not found");
    assertAgencyAccess(principal, rm);
    await audit.record({ actorId: principal.userId!, role: principal.role, incidentId: id, resource: "vitals", at: clock() });
    const q = req.query as Record<string, string>;
    return reply.send(await telemetry.latest(id, q.limit ? Number(q.limit) : undefined));
  });

  // POST /incidents/:id/replay — drain a responder's offline queue.
  app.post("/incidents/:id/replay", async (req, reply) => {
    const principal = resolvePrincipal(req.headers);
    requireAuthenticated(principal);
    assertRole(principal, ["responder", "dispatcher", "admin"]);

    const { id } = req.params as { id: string };
    const rm = await incidents.get(id);
    if (!rm) throw new NotFoundError("incident not found");
    assertAgencyAccess(principal, rm);

    const b = (req.body ?? {}) as Record<string, unknown>;
    if (!Array.isArray(b.commands)) throw new BadRequestError("commands array required");
    for (const c of b.commands as Record<string, unknown>[]) {
      if (typeof c.key !== "string" || typeof c.occurredAt !== "string") {
        throw new BadRequestError("each command needs key and occurredAt");
      }
    }

    return reply.send(await replay.replay(id, b.commands as ReplayCommand[], principal.userId!));
  });

  // POST /hospitals — register/replace a hospital. Admin-provisioned.
  app.post("/hospitals", async (req, reply) => {
    const principal = resolvePrincipal(req.headers);
    requireAuthenticated(principal);
    assertRole(principal, ["admin"]);

    const b = (req.body ?? {}) as Record<string, unknown>;
    if (!b.name || !b.location || !Array.isArray(b.capabilities) || typeof b.availableBeds !== "number") {
      throw new BadRequestError("name, location, capabilities, availableBeds required");
    }

    const h: Hospital = {
      id: typeof b.id === "string" ? b.id : idGen(),
      name: String(b.name),
      location: b.location as { lat: number; lng: number },
      capabilities: (b.capabilities as unknown[]).map(String),
      availableBeds: b.availableBeds,
      webhookUrl: typeof b.webhookUrl === "string" ? b.webhookUrl : null,
      updatedAt: clock(),
    };
    await hospitals.upsert(h);
    return reply.status(201).send(h);
  });

  // GET /hospitals?lat=&lng=&capability=&limit= — routing candidates, nearest first.
  app.get("/hospitals", async (req, reply) => {
    const principal = resolvePrincipal(req.headers);
    requireAuthenticated(principal);

    const q = req.query as Record<string, string>;
    const lat = Number(q.lat);
    const lng = Number(q.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new BadRequestError("lat and lng query params required");
    }
    const ranked = rankHospitals(await hospitals.list(), {
      location: { lat, lng },
      capability: q.capability,
      limit: q.limit ? Number(q.limit) : undefined,
    });
    return reply.send(ranked);
  });

  // POST /incidents/:id/hospital — select receiving hospital.
  app.post("/incidents/:id/hospital", async (req, reply) => {
    const principal = resolvePrincipal(req.headers);
    requireAuthenticated(principal);
    assertRole(principal, ["responder", "dispatcher", "admin"]);

    const { id } = req.params as { id: string };
    const rm = await incidents.get(id);
    if (!rm) throw new NotFoundError("incident not found");
    assertAgencyAccess(principal, rm);

    const b = (req.body ?? {}) as Record<string, unknown>;
    if (typeof b.hospitalId !== "string") throw new BadRequestError("hospitalId required");

    await hospital.selectHospital(id, b.hospitalId, principal.userId!);
    return reply.send(await incidents.get(id));
  });

  // POST /incidents/:id/hospital/alert — pre-arrival handoff.
  app.post("/incidents/:id/hospital/alert", async (req, reply) => {
    const principal = resolvePrincipal(req.headers);
    requireAuthenticated(principal);
    assertRole(principal, ["responder", "dispatcher", "admin"]);

    const { id } = req.params as { id: string };
    const rm = await incidents.get(id);
    if (!rm) throw new NotFoundError("incident not found");
    assertAgencyAccess(principal, rm);

    await hospital.alertHospital(id, principal.userId!);
    await audit.record({ actorId: principal.userId!, role: principal.role, incidentId: id, resource: "handoff", at: clock() });
    return reply.send(await incidents.get(id));
  });

  // GET /hospital/incidents — active incidents routed to this hospital.
  // Hospital staff principals carry their hospital id in the agency slot.
  app.get("/hospital/incidents", async (req, reply) => {
    const principal = resolvePrincipal(req.headers);
    requireAuthenticated(principal);
    assertRole(principal, ["hospital_staff", "admin"]);
    const q = req.query as Record<string, string>;
    const hospitalId = principal.role === "admin" ? q.hospitalId : principal.agencyId;
    if (!hospitalId) throw new BadRequestError("hospitalId required");
    return reply.send(await hospital.getHospitalActiveIncidents(hospitalId));
  });

  // GET /audit/access?incidentId= — PHI access trail. Admin only.
  app.get("/audit/access", async (req, reply) => {
    const principal = resolvePrincipal(req.headers);
    requireAuthenticated(principal);
    assertRole(principal, ["admin"]);
    const q = req.query as Record<string, string>;
    return reply.send(await audit.list(q.incidentId));
  });

  // GET /metrics/realtime — publish-lag counters.
  app.get("/metrics/realtime", async (req, reply) => {
    const principal = resolvePrincipal(req.headers);
    requireAuthenticated(principal);
    assertRole(principal, ["dispatcher", "hospital_staff", "admin"]);
    return reply.send(lag.snapshot());
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
