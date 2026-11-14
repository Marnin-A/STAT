import type { IncidentType, UnitType } from "@stat/shared";

// Runtime validation lives on the server: `@stat/shared` is a type-only
// contract for the API (its runtime exports are mock code the API must not
// pull in), so the enum guards belong here.

export const UNIT_TYPES: readonly UnitType[] = ["ambulance", "police", "fire", "rescue"];
export const INCIDENT_TYPES: readonly IncidentType[] = ["medical", "security", "fire", "hazard"];
export const PRIORITIES = ["critical", "serious", "stable"] as const;

const UNIT_TYPE_SET: ReadonlySet<string> = new Set(UNIT_TYPES);
const INCIDENT_TYPE_SET: ReadonlySet<string> = new Set(INCIDENT_TYPES);

export function isUnitType(v: unknown): v is UnitType {
  return typeof v === "string" && UNIT_TYPE_SET.has(v);
}

export function isIncidentType(v: unknown): v is IncidentType {
  return typeof v === "string" && INCIDENT_TYPE_SET.has(v);
}

// Which vehicle/crew types can serve an incident type. Unit vocabulary is the
// real-world one (ambulance/police/fire/rescue); incidents are categorised by
// what happened. `GET /units/available?for=` expands through this table so the
// client never has to know the mapping.
const SERVES: Record<IncidentType, readonly UnitType[]> = {
  medical: ["ambulance"],
  security: ["police"],
  fire: ["fire", "rescue"],
  hazard: ["fire", "rescue"],
};

export function unitTypesFor(incidentType: IncidentType): readonly UnitType[] {
  return SERVES[incidentType];
}
