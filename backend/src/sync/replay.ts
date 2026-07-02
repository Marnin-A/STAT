import { BadRequestError, DomainError } from "../shared/errors.js";
import type { IdempotencyStore } from "../shared/idempotency.js";
import type { EventStore } from "../incident/event-store.js";
import type { IncidentService } from "../incident/service.js";
import type { IncidentStatus } from "../incident/state-machine.js";
import type { TriageService } from "../triage/service.js";
import type { TelemetryService, TelemetryInput } from "../telemetry/service.js";
import type { TriageAnswer } from "../triage/scoring.js";

// Offline replay (design decision 4): responder's local queue drains here.
// Commands carry client `occurredAt` + idempotency key; server applies them
// in occurredAt order, dedupes by key, and never lets one failure stop the
// batch — the client clears its queue from the per-command results.
export interface ReplayCommand {
  key: string;
  kind: "status" | "triage" | "vitals";
  occurredAt: string;
  payload: Record<string, unknown>;
}

export interface ReplayResult {
  key: string;
  ok: boolean;
  error?: string;
}

export class ReplayService {
  constructor(
    private readonly incidents: IncidentService,
    private readonly triage: TriageService,
    private readonly telemetry: TelemetryService,
    private readonly events: EventStore,
    private readonly idempotency: IdempotencyStore,
  ) {}

  async replay(
    incidentId: string,
    commands: ReplayCommand[],
    actorId: string,
  ): Promise<ReplayResult[]> {
    const ordered = [...commands].sort(
      (a, b) => Date.parse(a.occurredAt) - Date.parse(b.occurredAt),
    );

    const results = new Map<string, ReplayResult>();
    for (const cmd of ordered) {
      const scoped = `replay:${actorId}:${incidentId}:${cmd.key}`;
      const seen = (await this.idempotency.get(scoped)) as ReplayResult | null;
      if (seen) {
        results.set(cmd.key, seen);
        continue;
      }

      let result: ReplayResult;
      try {
        await this.apply(incidentId, cmd, actorId);
        result = { key: cmd.key, ok: true };
      } catch (err) {
        result = {
          key: cmd.key,
          ok: false,
          error: err instanceof DomainError ? err.code : "INTERNAL",
        };
      }
      // Failed commands are cached too: a retried batch must not re-apply a
      // command that already executed with a different outcome.
      await this.idempotency.set(scoped, result);
      results.set(cmd.key, result);
    }

    // Report in applied (occurredAt) order.
    return ordered.map((c) => results.get(c.key)!);
  }

  private async apply(incidentId: string, cmd: ReplayCommand, actorId: string): Promise<void> {
    switch (cmd.kind) {
      case "status": {
        // Offline clients cannot know the head version; sequence at apply time.
        const version = await this.events.currentVersion(incidentId);
        await this.incidents.changeStatus(
          incidentId,
          cmd.payload.status as IncidentStatus,
          version,
          actorId,
        );
        return;
      }
      case "triage":
        await this.triage.submitAnswers(
          incidentId,
          cmd.payload.answers as TriageAnswer[],
          actorId,
          cmd.occurredAt,
        );
        return;
      case "vitals":
        await this.telemetry.record(incidentId, cmd.payload as unknown as TelemetryInput, actorId);
        return;
      default:
        throw new BadRequestError(`unknown replay command kind '${cmd.kind}'`);
    }
  }
}
