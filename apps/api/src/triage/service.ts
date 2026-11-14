import type { Clock, IdGen } from "../shared/event.js";
import { NotFoundError } from "../shared/errors.js";
import { appendEvent, type EventStore } from "../incident/event-store.js";
import type { IncidentService } from "../incident/service.js";
import { getQuestions, type TriageQuestion } from "./questionnaire.js";
import type { Triage } from "@stat/shared";
import { scoreTriage, type TriageAnswer, type TriageScore } from "./scoring.js";

export type { Triage };



export class TriageService {
  constructor(
    private readonly events: EventStore,
    private readonly incidents: IncidentService,
    private readonly idGen: IdGen,
    private readonly clock: Clock,
  ) {}

  async submitAnswers(
    incidentId: string,
    answers: TriageAnswer[],
    actorId: string,
    occurredAt: string,
  ): Promise<TriageScore> {
    const rm = await this.incidents.get(incidentId);
    if (!rm) throw new NotFoundError("incident not found");

    const score = scoreTriage(rm.type, answers); // throws BadRequest on unknown question

    await appendEvent(
      this.events,
      {
        incidentId,
        agencyId: rm.agencyId,
        type: "TriageSubmitted",
        actorId,
        occurredAt,
        payload: { answers, score },
        expectedVersion: await this.events.currentVersion(incidentId),
      },
      this.clock,
      this.idGen,
    );

    // First triage moves a fresh incident into `triaging`; later submissions
    // (re-triage on scene) leave the workflow status alone.
    if (rm.status === "created") {
      await this.incidents.changeStatus(
        incidentId,
        "triaging",
        await this.events.currentVersion(incidentId),
        actorId,
      );
    }

    return score;
  }

  // Latest-wins fold over TriageSubmitted events (resubmission replaces).
  async getTriage(incidentId: string): Promise<Triage> {
    const rm = await this.incidents.get(incidentId);
    if (!rm) throw new NotFoundError("incident not found");

    let answers: TriageAnswer[] = [];
    let score: TriageScore | null = null;
    for (const e of await this.events.load(incidentId)) {
      if (e.type !== "TriageSubmitted") continue;
      answers = e.payload.answers as TriageAnswer[];
      score = e.payload.score as TriageScore;
    }
    return { incidentId, questions: getQuestions(rm.type), answers, score };
  }
}
