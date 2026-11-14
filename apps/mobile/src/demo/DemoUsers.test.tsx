import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { it, expect, vi } from "vitest";
import { DemoProvider } from "./DemoProvider";
import { DemoPanel } from "./DemoPanel";
import { Profile } from "../pages/Profile";
import { DemoWorkspace } from "./DemoWorkspace";
import { ApiProvider } from "../api/ApiProvider";
import { AppLayout } from "../components/layout/AppLayout";
import { Dashboard } from "../pages/Dashboard";
import { MockApiClient } from "@stat/shared";
vi.mock("../hooks/useDeviceId", () => ({
  useDeviceId: () => "demo-test-device",
}));
function demo(enabled = true) {
  return render(
    <DemoProvider enabled={enabled}>
      <ApiProvider>
        <MemoryRouter>
          <DemoPanel />
          <Profile />
          <DemoWorkspace />
        </MemoryRouter>
      </ApiProvider>
    </DemoProvider>,
  );
}
it("switches all five synthetic personas and displays complete role details", async () => {
  demo();
  await userEvent.click(screen.getByText(/Synthetic demo users/));
  expect(
    screen.getByRole("heading", { name: "Amara Bello" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Penicillin — sample allergy")).toBeInTheDocument();
  for (const [role, name] of [
    ["responder", "Chidi Nwosu"],
    ["dispatcher", "Bisola Akinwale"],
    ["hospital_staff", "Dr. Nneka Adeyemi"],
    ["admin", "Musa Danjuma"],
  ]) {
    await userEvent.selectOptions(screen.getByLabelText("Demo persona"), role);
    expect(screen.getByRole("heading", { name, level: 1 })).toBeInTheDocument();
  }
  await waitFor(() =>
    expect(screen.getByText("demo-medical-active")).toBeInTheDocument(),
  );
  expect(
    screen.getByRole("button", { name: "Reset demo data" }),
  ).toBeInTheDocument();
});
it("does not offer demo identities when disabled for real API mode", () => {
  demo(false);
  expect(screen.queryByLabelText("Demo persona")).not.toBeInTheDocument();
  expect(screen.queryByText("Amara Bello")).not.toBeInTheDocument();
  expect(screen.getByText("Sharing is off")).toBeInTheDocument();
});
it("cannot expose personas when a real API is configured, even if enabled is requested", () => {
  vi.stubEnv("VITE_API_URL", "https://api.example.test");
  try {
    demo(true);
    expect(screen.queryByLabelText("Demo persona")).not.toBeInTheDocument();
    expect(screen.queryByText("Amara Bello")).not.toBeInTheDocument();
  } finally {
    vi.unstubAllEnvs();
  }
});
it("clears an uncertain request from the mounted Home view on persona switch and reset", async () => {
  const request = vi
    .spyOn(MockApiClient.prototype, "createIncident")
    .mockRejectedValue(new Error("demo outage"));
  try {
    render(
      <DemoProvider enabled>
        <ApiProvider>
          <MemoryRouter>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </MemoryRouter>
        </ApiProvider>
      </DemoProvider>,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Request medical help" }),
    );
    expect(
      await screen.findByRole("button", { name: "Retry same request" }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Demo tools" }));
    await userEvent.selectOptions(
      screen.getByLabelText("Demo persona"),
      "responder",
    );
    expect(
      screen.getByRole("button", { name: "Request medical help" }),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "Request medical help" }),
    );
    expect(
      await screen.findByRole("button", { name: "Retry same request" }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Demo tools" }));
    await userEvent.click(
      screen.getByRole("button", { name: "Reset demo data" }),
    );
    expect(
      screen.getByRole("button", { name: "Request medical help" }),
    ).toBeInTheDocument();
  } finally {
    request.mockRestore();
    sessionStorage.clear();
  }
});
