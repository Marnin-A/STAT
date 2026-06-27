import { describe, it, expect } from "vitest";
import { assessSos, type SosSignalCounts } from "./abuse.js";

const fresh: SosSignalCounts = { device: 0, ip: 0, location: 0 };

describe("SOS abuse assessment (fail-open)", () => {
  it("accepts a fresh first SOS with zero risk and no flag", () => {
    const d = assessSos(fresh);
    expect(d.accepted).toBe(true);
    expect(d.flagged).toBe(false);
    expect(d.hardBlock).toBe(false);
    expect(d.riskScore).toBe(0);
  });

  it("raises risk and flags on repeated device but still accepts", () => {
    const d = assessSos({ ...fresh, device: 4 });
    expect(d.riskScore).toBeGreaterThanOrEqual(50);
    expect(d.flagged).toBe(true);
    expect(d.accepted).toBe(true); // fail-open: flag, do not block
    expect(d.hardBlock).toBe(false);
  });

  it("hard-blocks only obvious automated spam (extreme repeat)", () => {
    const d = assessSos({ ...fresh, device: 50 });
    expect(d.hardBlock).toBe(true);
    expect(d.accepted).toBe(false);
  });

  it("caps risk at 100", () => {
    const d = assessSos({ device: 10, ip: 10, location: 10 });
    expect(d.riskScore).toBeLessThanOrEqual(100);
  });

  it("records reasons for raised risk", () => {
    const d = assessSos({ ...fresh, device: 4 });
    expect(d.reasons.length).toBeGreaterThan(0);
  });
});
