import { describe, expect, it } from "vitest";
import { averageFootballShieldRating, type FootballShieldStats } from "./FootballShieldContent";

const complete: FootballShieldStats = { pace: 81, shooting: 84, passing: 79, dribbling: 82, defending: 61, physical: 73 };

describe("averageFootballShieldRating", () => {
  it("rounds the mean of all six football ratings", () => {
    expect(averageFootballShieldRating(complete)).toBe(77);
  });

  it("keeps zero ratings in the calculation", () => {
    expect(averageFootballShieldRating({ pace: 0, shooting: 0, passing: 0, dribbling: 0, defending: 0, physical: 0 })).toBe(0);
    expect(averageFootballShieldRating({ ...complete, pace: 0 })).toBe(63);
  });

  it("does not show a misleading average for an incomplete profile", () => {
    expect(averageFootballShieldRating()).toBeNull();
    expect(averageFootballShieldRating({ ...complete, physical: undefined })).toBeNull();
  });

  it.each([NaN, Infinity, -1, 100])("rejects a rating outside the valid scale: %s", (physical) => {
    expect(averageFootballShieldRating({ ...complete, physical })).toBeNull();
  });
});
