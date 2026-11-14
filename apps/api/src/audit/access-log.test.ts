import { describe, it, expect } from "vitest";
import { InMemoryAccessLog } from "./access-log.js";

describe("InMemoryAccessLog", () => {
  it("records and filters PHI access entries by incident", async () => {
    const log = new InMemoryAccessLog();
    await log.record({ actorId: "h1", role: "hospital_staff", incidentId: "inc-1", resource: "vitals", at: "t1" });
    await log.record({ actorId: "d1", role: "dispatcher", incidentId: "inc-2", resource: "triage", at: "t2" });

    expect(await log.list("inc-1")).toHaveLength(1);
    expect((await log.list("inc-1"))[0]!.resource).toBe("vitals");
    expect(await log.list()).toHaveLength(2);
  });
});
