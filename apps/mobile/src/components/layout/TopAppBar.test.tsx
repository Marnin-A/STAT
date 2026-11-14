import { render, screen } from "@testing-library/react";
import { it, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { TopAppBar } from "./TopAppBar";
it("shows branding and guest access without an unverified emergency phone link", () => {
  render(<MemoryRouter><TopAppBar /></MemoryRouter>);
  expect(screen.getByRole("link", { name: "STAT Home" })).toHaveAttribute(
    "href",
    "/",
  );
  expect(screen.getByRole("link", { name: "Guest" })).toHaveAttribute(
    "href",
    "/profile",
  );
  expect(
    screen.queryByRole("link", { name: /Call Dispatch/ }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("banner")).toHaveClass("safe-area-top");
});
