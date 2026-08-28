import type { TriageAnswer, TriageScore } from "@stat/shared";
import { BadRequestError } from "../shared/errors.js";
import { getRules } from "./questionnaire.js";

export type { TriageAnswer, TriageScore };

const CRITICAL_AT = 70;
const SERIOUS_AT = 40;

// Pure, deterministic (<100 ms target is trivially met): sum matched rule
// points, cap at 100, band into level.
export function scoreTriage(incidentType: string, answers: TriageAnswer[]): TriageScore {
  const rules = getRules(incidentType);
  const byQuestion = new Map(rules.map((r) => [r.question.id, r]));

  let score = 0;
  const flags: string[] = [];
  const recommendations: string[] = [];

  for (const answer of answers) {
    const rule = byQuestion.get(answer.questionId);
    if (!rule) throw new BadRequestError(`unknown triage question '${answer.questionId}'`);
    if (rule.matches(answer.value)) {
      score += rule.points;
      flags.push(rule.flag);
      recommendations.push(rule.recommendation);
    }
  }

  score = Math.min(100, score);
  const level = score >= CRITICAL_AT ? "critical" : score >= SERIOUS_AT ? "serious" : "stable";
  return { score, level, flags, recommendations };
}
