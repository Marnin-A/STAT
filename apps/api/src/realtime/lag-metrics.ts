// Publish-lag counters: time from event recordedAt to bus publish. With
// in-memory fan-out this approximates end-to-end projection/delivery lag;
// once Redis + separate projector workers exist, each hop gets its own timer.
export interface LagSnapshot {
  published: number;
  maxLagMs: number;
  avgLagMs: number;
}

export class LagMetrics {
  private published = 0;
  private maxLagMs = 0;
  private totalLagMs = 0;

  constructor(private readonly nowMs: () => number = Date.now) {}

  record(recordedAtIso: string): void {
    const lag = Math.max(0, this.nowMs() - Date.parse(recordedAtIso));
    this.published += 1;
    this.totalLagMs += lag;
    if (lag > this.maxLagMs) this.maxLagMs = lag;
  }

  snapshot(): LagSnapshot {
    return {
      published: this.published,
      maxLagMs: this.maxLagMs,
      avgLagMs: this.published ? this.totalLagMs / this.published : 0,
    };
  }
}
