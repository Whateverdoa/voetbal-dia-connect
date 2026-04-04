import { describe, expect, it } from "vitest";
import { hasManualResult } from "./syncWedstrijdenToMatches";

describe("syncWedstrijdenToMatches.hasManualResult", () => {
  it("returns false for a clean scheduled match without a score", () => {
    expect(
      hasManualResult({
        status: "scheduled",
        homeScore: 0,
        awayScore: 0,
        finishedAt: undefined,
      })
    ).toBe(false);
  });

  it("returns true when a scheduled match already has a manual score", () => {
    expect(
      hasManualResult({
        status: "scheduled",
        homeScore: 2,
        awayScore: 1,
        finishedAt: undefined,
      })
    ).toBe(true);
  });

  it("returns true for a finished match, including 0-0", () => {
    expect(
      hasManualResult({
        status: "finished",
        homeScore: 0,
        awayScore: 0,
        finishedAt: 123,
      })
    ).toBe(true);
  });
});
