import type { TriageQuestion } from "@stat/shared";
import { BadRequestError } from "../shared/errors.js";

// Protocol questionnaire (design decision 7: deterministic rules first, LLM
// async enrichment later).
export type { TriageQuestion };

// Scoring rule per question: points added when the predicate matches, plus
// the risk flag and recommendation it raises.
export interface TriageRule {
  question: TriageQuestion;
  // Points contributed to the 0-100 score when matched.
  points: number;
  matches: (value: string | boolean) => boolean;
  flag: string;
  recommendation: string;
}

const MEDICAL: TriageRule[] = [
  {
    question: { id: "med-conscious", text: "Is the patient conscious?", type: "yes_no" },
    points: 40,
    matches: (v) => v === false,
    flag: "unconscious",
    recommendation: "Check airway; place in recovery position",
  },
  {
    question: { id: "med-breathing", text: "Is the patient breathing normally?", type: "yes_no" },
    points: 45,
    matches: (v) => v === false,
    flag: "not_breathing",
    recommendation: "Begin CPR if trained; responder priority upgrade",
  },
  {
    question: {
      id: "med-bleeding",
      text: "How severe is any bleeding?",
      type: "multiple_choice",
      options: ["none", "minor", "severe"],
    },
    points: 40,
    matches: (v) => v === "severe",
    flag: "severe_bleeding",
    recommendation: "Apply direct pressure to the wound",
  },
  {
    question: { id: "med-chest-pain", text: "Is there chest pain or pressure?", type: "yes_no" },
    points: 35,
    matches: (v) => v === true,
    flag: "chest_pain",
    recommendation: "Possible cardiac event; keep patient still",
  },
];

const SECURITY: TriageRule[] = [
  {
    question: { id: "sec-weapons", text: "Are weapons involved?", type: "yes_no" },
    points: 45,
    matches: (v) => v === true,
    flag: "weapons_present",
    recommendation: "Keep distance; do not engage",
  },
  {
    question: { id: "sec-ongoing", text: "Is the threat still ongoing?", type: "yes_no" },
    points: 35,
    matches: (v) => v === true,
    flag: "threat_ongoing",
    recommendation: "Move to a safe location if possible",
  },
  {
    question: { id: "sec-injuries", text: "Is anyone injured?", type: "yes_no" },
    points: 30,
    matches: (v) => v === true,
    flag: "casualties",
    recommendation: "Request medical co-response",
  },
];

const FIRE: TriageRule[] = [
  {
    question: { id: "fire-trapped", text: "Is anyone trapped inside?", type: "yes_no" },
    points: 50,
    matches: (v) => v === true,
    flag: "persons_trapped",
    recommendation: "Do not re-enter; report last known location",
  },
  {
    question: { id: "fire-spreading", text: "Is the fire spreading?", type: "yes_no" },
    points: 35,
    matches: (v) => v === true,
    flag: "fire_spreading",
    recommendation: "Evacuate adjacent buildings",
  },
  {
    question: {
      id: "fire-material",
      text: "What is burning?",
      type: "multiple_choice",
      options: ["unknown", "building", "vehicle", "chemical"],
    },
    points: 40,
    matches: (v) => v === "chemical",
    flag: "hazmat",
    recommendation: "Stay upwind; hazmat unit required",
  },
];

const PROTOCOLS: Record<string, TriageRule[]> = {
  medical: MEDICAL,
  security: SECURITY,
  fire: FIRE,
};

export function getRules(incidentType: string): TriageRule[] {
  const rules = PROTOCOLS[incidentType];
  if (!rules) throw new BadRequestError(`no triage protocol for type '${incidentType}'`);
  return rules;
}

export function getQuestions(incidentType: string): TriageQuestion[] {
  return getRules(incidentType).map((r) => r.question);
}
