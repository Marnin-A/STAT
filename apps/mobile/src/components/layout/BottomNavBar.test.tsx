import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { it, expect } from "vitest";
import { BottomNavBar } from "./BottomNavBar";
it("links Home Activity Profile and exposes current destination", () => {
  render(
    <MemoryRouter initialEntries={["/activity"]}>
      <BottomNavBar />
    </MemoryRouter>,
  );
  expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute(
    "href",
    "/",
  );
  expect(screen.getByRole("link", { name: "Activity" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute(
    "href",
    "/profile",
  );
  expect(screen.getByRole("navigation")).toHaveClass("safe-area-bottom");
});
