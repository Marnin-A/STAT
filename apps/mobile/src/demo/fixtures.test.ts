import { it, expect } from "vitest";
import { createDemoData, createDemoApi } from "./fixtures";
it("provides five complete personas with linked medical assignment and hospital intake", async () => {
  const data = createDemoData();
  expect(data.users.map((u) => u.role)).toEqual([
    "citizen",
    "responder",
    "dispatcher",
    "hospital_staff",
    "admin",
  ]);
  for (const user of data.users) {
    expect(user.name.length).toBeGreaterThan(5);
    expect(user.email).toMatch(/@example\.test$/);
    expect(user.details.length).toBeGreaterThanOrEqual(4);
  }
  const api = createDemoApi();
  const incident = await api.getIncident("demo-medical-active");
  expect(incident.assignedUnitIds).toEqual(["demo-ambulance-01"]);
  expect(incident.hospitalId).toBe("demo-hospital-01");
  expect(incident.notes.map((n) => n.actorId)).toEqual([
    "demo-dispatcher",
    "demo-responder",
  ]);
  expect((await api.getHospitalActiveIncidents()).map((i) => i.id)).toEqual([
    "demo-medical-active",
  ]);
});
it("fresh scenarios restore state without mutating fixture templates or other instances", async () => {
  const first = createDemoApi();
  await first.transitionIncident("demo-medical-active", "resolved", 5);
  expect(await first.getHospitalActiveIncidents()).toEqual([]);
  const fresh = createDemoApi();
  expect((await fresh.getIncident("demo-medical-active")).status).toBe(
    "en_route",
  );
  expect(createDemoData().incidents[0].status).toBe("en_route");
});
