import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { it, expect, vi } from "vitest";
import { ApiProvider } from "../api/ApiProvider";
import { Dashboard } from "./Dashboard";
vi.mock("../hooks/useDeviceId", () => ({ useDeviceId: () => "test" }));
it("offers medical help and optional location without other emergency selectors", () => {
  render(
    <ApiProvider>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </ApiProvider>,
  );
  expect(
    screen.getByRole("button", { name: "Request medical help" }),
  ).toBeEnabled();
  expect(screen.getByText("Location not shared")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Your Medical ID/ })).toHaveAttribute(
    "href",
    "/profile",
  );
  expect(screen.queryByText("Security")).not.toBeInTheDocument();
});
