import { describe, it, expect, beforeEach } from "vitest";
import { IncidentService } from "../incident/service.js";
import { InMemoryEventStore } from "../incident/event-store.js";
import { InMemoryRateLimitStore } from "../incident/rate-limit.js";
import { InMemoryIdempotencyStore } from "../shared/idempotency.js";
import { TriageService } from "../triage/service.js";
import { TelemetryService } from "../telemetry/service.js";
import { ReplayService, type ReplayCommand } from "./replay.js";

const at = (m: number) => `2026-07-02T10:${String(m).padStart(2, "0")}:00.000Z`;

const sos = {
  agencyId: "agency-1",
  type: "medical",
  priority: "critical",
  location: { lat: 6.5, lng: 3.4 },
  reporterId: null,
  deviceId: "dev-1",
  ip: "1.2.3.4",
  occurredAt: at(0),
};

let incidents: IncidentService;
let telemetry: TelemetryService;
let replay: ReplayService;
let incidentId: string;

beforeEach(async () => {
  let n = 0;
  const idGen = () => `id-${++n}`;
  const clock = () => at(30);
  const events = new InMemoryEventStore();
  incidents = new IncidentService(events, new InMemoryRateLimitStore(), idGen, clock);
  const triage = new TriageService(events, incidents, idGen, clock);
  telemetry = new TelemetryService(events, incidents, idGen, clock);
  replay = new ReplayService(incidents, triage, telemetry, events, new InMemoryIdempotencyStore());
  ({ incidentId } = await incidents.createSos(sos));
});

describe("ReplayService", () => {
  it("applies queued commands in occurredAt order regardless of submit order", async () => {
    const commands: ReplayCommand[] = [
      { key: "c3", kind: "vitals", occurredAt: at(12), payload: { kind: "vitals", capturedAt: at(12), payload: { hr: 90 } } },
      { key: "c2", kind: "status", occurredAt: at(10), payload: { status: "en_route" } },
      { key: "c1", kind: "status", occurredAt: at(5), payload: { status: "dispatched" } },
    ];
    const results = await replay.replay(incidentId, commands, "resp-1");
    expect(results.map((r) => r.key)).toEqual(["c1", "c2", "c3"]);
    expect(results.every((r) => r.ok)).toBe(true);
    expect((await incidents.get(incidentId))!.status).toBe("en_route");
    expect(await telemetry.latest(incidentId)).toHaveLength(1);
  });

  it("replaying the same batch is idempotent (no duplicate effects)", async () => {
    const commands: ReplayCommand[] = [
      { key: "v1", kind: "vitals", occurredAt: at(5), payload: { kind: "vitals", capturedAt: at(5), payload: { hr: 100 } } },
    ];
    await replay.replay(incidentId, commands, "resp-1");
    const second = await replay.replay(incidentId, commands, "resp-1");
    expect(second[0]!.ok).toBe(true);
    expect(await telemetry.latest(incidentId)).toHaveLength(1);
  });

  it("a failing command reports its error and does not stop the rest", async () => {
    const commands: ReplayCommand[] = [
      { key: "bad", kind: "status", occurredAt: at(5), payload: { status: "resolved" } }, // invalid from created
      { key: "good", kind: "vitals", occurredAt: at(6), payload: { kind: "vitals", capturedAt: at(6), payload: { hr: 88 } } },
    ];
    const results = await replay.replay(incidentId, commands, "resp-1");
    expect(results[0]!.ok).toBe(false);
    expect(results[0]!.error).toBe("INVALID_TRANSITION");
    expect(results[1]!.ok).toBe(true);
  });

  it("rejects unknown command kinds", async () => {
    const results = await replay.replay(
      incidentId,
      [{ key: "x", kind: "teleport" as never, occurredAt: at(1), payload: {} }],
      "resp-1",
    );
    expect(results[0]!.ok).toBe(false);
    expect(results[0]!.error).toBe("BAD_REQUEST");
  });
});
