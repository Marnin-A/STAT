import type { EventStore } from "../incident/event-store.js";

export const RETENTION_DAYS = 90;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Vitals retention (NDPA).
 *
 * The event log is append-only and the audit trail depends on that, but the
 * NDPA obligation is to stop holding the patient data. Those pull in opposite
 * directions, so the job **redacts rather than deletes**: the
 * `TelemetryRecorded` event stays — who recorded vitals, on which incident,
 * when — and its payload is emptied. The timeline stays intact and provable;
 * the clinical readings are gone.
 *
 * Deleting the rows outright would punch holes in the version sequence and
 * break every projection folded from the stream.
 */
export function retentionCutoff(now: string): string {
  return new Date(Date.parse(now) - RETENTION_DAYS * DAY_MS).toISOString();
}

/**
 * Redacts every telemetry payload captured before the cutoff.
 *
 * Returns how many events were redacted. Safe to run repeatedly: an
 * already-empty payload is not counted again.
 */
export async function runRetention(store: EventStore, now: string): Promise<number> {
  if (!store.redactTelemetryBefore) {
    throw new Error("event store does not support retention redaction");
  }
  return store.redactTelemetryBefore(retentionCutoff(now));
}
