import { describe, it, expect } from "vitest";
import { getQuestions } from "./questionnaire.js";
import { scoreTriage } from "./scoring.js";
import { BadRequestError } from "../shared/errors.js";

describe("questionnaire", () => {
  it("provides protocol questions per incident type", () => {
    for (const type of ["medical", "security", "fire"] as const) {
      const qs = getQuestions(type);
      expect(qs.length).toBeGreaterThanOrEqual(3);
      for (const q of qs) {
        expect(q.id).toBeTruthy();
        expect(q.text).toBeTruthy();
        expect(["yes_no", "multiple_choice"]).toContain(q.type);
        if (q.type === "multiple_choice") expect(q.options!.length).toBeGreaterThan(1);
      }
    }
  });

  it("rejects unknown incident type", () => {
    expect(() => getQuestions("weather")).toThrow(BadRequestError);
  });
});

describe("scoreTriage", () => {
  it("unconscious non-breathing patient scores critical with flags", () => {
    const res = scoreTriage("medical", [
      { questionId: "med-conscious", value: false },
      { questionId: "med-breathing", value: false },
    ]);
    expect(res.level).toBe("critical");
    expect(res.score).toBeGreaterThanOrEqual(70);
    expect(res.flags).toContain("unconscious");
    expect(res.flags).toContain("not_breathing");
    expect(res.recommendations.length).toBeGreaterThan(0);
  });

  it("conscious breathing patient with no other findings scores stable", () => {
    const res = scoreTriage("medical", [
      { questionId: "med-conscious", value: true },
      { questionId: "med-breathing", value: true },
      { questionId: "med-bleeding", value: "none" },
    ]);
    expect(res.level).toBe("stable");
    expect(res.score).toBeLessThan(40);
  });

  it("severe bleeding alone scores at least serious", () => {
    const res = scoreTriage("medical", [
      { questionId: "med-conscious", value: true },
      { questionId: "med-breathing", value: true },
      { questionId: "med-bleeding", value: "severe" },
    ]);
    expect(["serious", "critical"]).toContain(res.level);
  });

  it("weapons present scores security incident critical", () => {
    const res = scoreTriage("security", [
      { questionId: "sec-weapons", value: true },
      { questionId: "sec-ongoing", value: true },
    ]);
    expect(res.level).toBe("critical");
  });

  it("is deterministic: same answers -> same score", () => {
    const answers = [
      { questionId: "fire-spreading", value: true },
      { questionId: "fire-trapped", value: false },
    ];
    expect(scoreTriage("fire", answers)).toEqual(scoreTriage("fire", answers));
  });

  it("rejects answers to unknown questions", () => {
    expect(() => scoreTriage("medical", [{ questionId: "nope", value: true }])).toThrow(
      BadRequestError,
    );
  });
});
