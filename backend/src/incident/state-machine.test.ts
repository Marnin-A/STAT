import { describe, it, expect } from "vitest";
import {
  type IncidentStatus,
  canTransition,
  assertTransition,
  isTerminal,
} from "./state-machine.js";
import { InvalidTransitionError } from "../shared/errors.js";

describe("incident state machine", () => {
  const happyPath: IncidentStatus[] = [
    "created",
    "triaging",
    "dispatched",
    "en_route",
    "on_scene",
    "transporting",
    "resolved",
  ];

  it("allows each step of the happy path", () => {
    for (let i = 0; i < happyPath.length - 1; i++) {
      expect(canTransition(happyPath[i]!, happyPath[i + 1]!)).toBe(true);
    }
  });

  it("allows cancel from any non-terminal status", () => {
    const nonTerminal: IncidentStatus[] = [
      "created",
      "triaging",
      "dispatched",
      "en_route",
      "on_scene",
      "transporting",
    ];
    for (const s of nonTerminal) {
      expect(canTransition(s, "cancelled")).toBe(true);
    }
  });

  it("rejects skipping a step", () => {
    expect(canTransition("created", "en_route")).toBe(false);
    expect(canTransition("triaging", "on_scene")).toBe(false);
  });

  it("rejects going backwards", () => {
    expect(canTransition("dispatched", "created")).toBe(false);
    expect(canTransition("on_scene", "dispatched")).toBe(false);
  });

  it("treats resolved and cancelled as terminal", () => {
    expect(isTerminal("resolved")).toBe(true);
    expect(isTerminal("cancelled")).toBe(true);
    expect(isTerminal("created")).toBe(false);
    expect(canTransition("resolved", "cancelled")).toBe(false);
    expect(canTransition("cancelled", "resolved")).toBe(false);
  });

  it("rejects no-op self transition", () => {
    expect(canTransition("dispatched", "dispatched")).toBe(false);
  });

  it("assertTransition throws InvalidTransitionError on bad transition", () => {
    expect(() => assertTransition("created", "resolved")).toThrowError(
      InvalidTransitionError,
    );
  });

  it("assertTransition is silent on valid transition", () => {
    expect(() => assertTransition("created", "triaging")).not.toThrow();
  });
});
