import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { vi, it, expect } from "vitest";
import { MockApiClient } from "@stat/shared";
import { ApiProvider } from "../api/ApiProvider";
import { Dashboard } from "./Dashboard";
vi.mock("../hooks/useDeviceId", () => ({ useDeviceId: () => "device-test" }));
const gps = vi.hoisted(() => vi.fn(() => new Promise<null>(() => {})));
vi.mock("../hooks/useGeolocation", () => ({
  useGeolocation: () => ({
    location: null,
    loading: false,
    error: null,
    getCurrentPosition: gps,
  }),
}));
vi.mock("../hooks/useHaptics", () => ({
  useHaptics: () => ({
    impactHeavy: () => new Promise(() => {}),
    notificationSuccess: () => new Promise(() => {}),
  }),
}));
it("sends medical SOS immediately without awaiting GPS or haptics; retries retain identity", async () => {
  const api = new MockApiClient();
  const create = vi
    .spyOn(api, "createIncident")
    .mockRejectedValue(new Error("connection lost"));
  render(
    <ApiProvider client={api}>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </ApiProvider>,
  );
  await userEvent.click(
    screen.getByRole("button", { name: /request medical help/i }),
  );
  await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
  expect(create.mock.calls[0][0]).toMatchObject({
    type: "medical",
    location: null,
  });
  expect(gps).not.toHaveBeenCalled();
  expect(await screen.findByRole("alert")).toHaveTextContent(
    /delivery.*confirmed/i,
  );
  await userEvent.click(
    screen.getByRole("button", { name: /retry same request/i }),
  );
  await waitFor(() => expect(create).toHaveBeenCalledTimes(2));
  expect(create.mock.calls[1]).toEqual(create.mock.calls[0]);
  expect(
    screen.queryByRole("button", { name: /^fire$/i }),
  ).not.toBeInTheDocument();
});
