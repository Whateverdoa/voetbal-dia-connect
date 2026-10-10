import { describe, expect, it } from "vitest";
import { buildFinishedScorePatch } from "./syncScoreApply";

describe("buildFinishedScorePatch", () => {
  it("skips live matches", () => {
    const { result } = buildFinishedScorePatch(
      { homeScore: 1, awayScore: 0, status: "live" },
      2,
      1,
      1000,
    );
    expect(result.kind).toBe("skipped_live");
  });

  it("flags when overwriting a different finished score", () => {
    const { result, patch } = buildFinishedScorePatch(
      { homeScore: 3, awayScore: 1, status: "finished" },
      2,
      1,
      5000,
    );
    expect(result).toEqual({ kind: "applied", discrepancy: true });
    expect(patch.homeScore).toBe(2);
    expect(patch.scoreDiscrepancyAt).toBe(5000);
    expect(patch.scoreDiscrepancyLocalHome).toBe(3);
    expect(patch.scoreDiscrepancySportlinkHome).toBe(2);
  });

  it("applies without flag when scheduled 0-0 becomes official", () => {
    const { result, patch } = buildFinishedScorePatch(
      { homeScore: 0, awayScore: 0, status: "scheduled" },
      2,
      0,
      5000,
    );
    expect(result).toEqual({ kind: "applied", discrepancy: false });
    expect(patch.scoreDiscrepancyAt).toBeUndefined();
  });

  it("clears flag when scores align again", () => {
    const { patch } = buildFinishedScorePatch(
      {
        homeScore: 2,
        awayScore: 1,
        status: "finished",
        scoreDiscrepancyAt: 100,
      },
      2,
      1,
      5000,
    );
    expect(patch.scoreDiscrepancyAt).toBeUndefined();
  });
});
