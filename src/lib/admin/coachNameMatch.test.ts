import { describe, expect, it } from "vitest";
import {
  buildCoachEmailIndex,
  coachNameKeys,
  findSeedEmailForCoach,
  normalizeCoachName,
} from "../../../convex/lib/coachNameMatch";

describe("coachNameMatch", () => {
  it("normalizes accents and punctuation", () => {
    expect(normalizeCoachName("René van Dijk")).toBe("rene van dijk");
    expect(normalizeCoachName("  Samuël  Lens ")).toBe("samuel lens");
  });

  it("handles Last, First seed format", () => {
    const keys = coachNameKeys("Heijkant, Ruud van den");
    expect(keys).toContain("ruud van den heijkant");
  });

  it("finds email by exact and reordered name", () => {
    const index = buildCoachEmailIndex([
      { name: "Heijkant, Ruud van den", email: "ruud@example.com" },
      { name: "René van Dijk", email: "rene@example.com" },
    ]);
    expect(findSeedEmailForCoach(index, "Ruud van den Heijkant")?.email).toBe(
      "ruud@example.com"
    );
    expect(findSeedEmailForCoach(index, "Rene van Dijk")?.email).toBe(
      "rene@example.com"
    );
  });
});
