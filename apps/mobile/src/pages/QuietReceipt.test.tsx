import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { it, expect, vi } from "vitest";
import { MockApiClient } from "@stat/shared";
import { ApiProvider } from "../api/ApiProvider";
import { TriageTracking } from "./TriageTracking";
it("does not infer dispatch, readings or ETA from an acknowledged SOS", async () => {
  const api = new MockApiClient();
  const incident = await api.createIncident(
    {
      type: "medical",
      location: null,
      deviceId: "test",
      occurredAt: new Date().toISOString(),
    },
    "receipt-test",
  );
  vi.spyOn(api, "getTriage").mockRejectedValue(new Error("not ready"));
  render(
    <ApiProvider client={api}>
      <MemoryRouter initialEntries={["/triage/" + incident.id]}>
        <Routes>
          <Route path="/triage/:id" element={<TriageTracking />} />
        </Routes>
      </MemoryRouter>
    </ApiProvider>,
  );
  expect(
    await screen.findByText("No responder has been assigned yet."),
  ).toBeInTheDocument();
  expect(screen.queryByText(/ETA:/)).not.toBeInTheDocument();
  expect(screen.queryByText("112")).not.toBeInTheDocument();
  expect(screen.queryByText("Live")).not.toBeInTheDocument();
});
