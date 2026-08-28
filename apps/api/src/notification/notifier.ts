import type { GeoPoint } from "../incident/projection.js";
import type { TriageScore } from "../triage/scoring.js";
import type { TelemetrySample } from "../telemetry/service.js";

// Pre-arrival handoff pushed to the receiving hospital. Dashboard delivery is
// already covered by the SSE/WS fan-out; this port carries the out-of-band
// channels (webhook now; Africa's Talking SMS + FCM push impls swap in here).
export interface HandoffNotification {
  hospitalId: string;
  incidentId: string;
  summary: {
    type: string;
    priority: string;
    status: string;
    location: GeoPoint | null;
    triage: TriageScore | null;
    latestVitals: TelemetrySample[];
  };
  sentAt: string;
}

export interface Notifier {
  sendHandoff(notification: HandoffNotification): Promise<void>;
}

// Dev/test impl: records instead of sending.
export class InMemoryNotifier implements Notifier {
  readonly sent: HandoffNotification[] = [];

  async sendHandoff(notification: HandoffNotification): Promise<void> {
    this.sent.push(notification);
  }
}
