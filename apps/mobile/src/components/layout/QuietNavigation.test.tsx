import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { it, expect } from "vitest";
import { BottomNavBar } from "./BottomNavBar";
it("keeps only labelled citizen destinations in the primary navigation", () => {
  render(
    <MemoryRouter>
      <BottomNavBar />
    </MemoryRouter>,
  );
  expect(screen.getAllByRole("link").map((a) => a.textContent)).toEqual([
    "Home",
    "Activity",
    "Profile",
  ]);
  expect(screen.getByRole("link", { name: "Profile" })).toHaveAttribute(
    "href",
    "/profile",
  );
});
