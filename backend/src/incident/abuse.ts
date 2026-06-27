// Prior SOS hit counts for a device / IP / location within the rate-limit
// window. Gathered by the service before scoring.
export interface SosSignalCounts {
  device: number;
  ip: number;
  location: number;
}

export interface AbuseDecision {
  accepted: boolean; // fail-open: true unless hardBlock
  flagged: boolean; // low-confidence -> SOSFlagged
  hardBlock: boolean; // obvious automated spam only
  riskScore: number; // 0..100
  reasons: string[];
}

const FLAG_THRESHOLD = 50;
const HARD_BLOCK_DEVICE_HITS = 20;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

// Deterministic risk scoring. Counts injected -> pure & testable.
// Policy: accept by default, raise risk, flag the doubtful, hard-block only
// blatant automation. See docs/plans/backend-system-design.md SOS abuse model.
export function assessSos(counts: SosSignalCounts): AbuseDecision {
  const reasons: string[] = [];
  let risk = 0;

  if (counts.device > 0) {
    risk += Math.min(counts.device, 5) * 15;
    reasons.push(`device repeated ${counts.device}x`);
  }
  if (counts.ip > 5) {
    risk += 20;
    reasons.push(`ip repeated ${counts.ip}x`);
  }
  if (counts.location > 0) {
    risk += 10;
    reasons.push(`duplicate location ${counts.location}x`);
  }

  const riskScore = clamp(risk, 0, 100);
  const hardBlock = counts.device >= HARD_BLOCK_DEVICE_HITS;

  return {
    accepted: !hardBlock,
    flagged: !hardBlock && riskScore >= FLAG_THRESHOLD,
    hardBlock,
    riskScore,
    reasons,
  };
}
