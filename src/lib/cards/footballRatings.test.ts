import { describe, expect, it } from "vitest";
import { averageFootballShieldRating, toFootballShieldStats } from "./footballRatings";
import { isFcAssessment, ratingOverall, withCardBonus } from "./fc27";

describe("collection and stored assessment integration", () => {
  it("preserves all six attributes and uses the same mean after a capped bonus", () => {
    const ratings = { snl: 99, sch: 84, pas: 79, dri: 82, vrd: 61, fys: 73 };
    expect(toFootballShieldStats(ratings)).toEqual({ pace: 99, shooting: 84, passing: 79, dribbling: 82, defending: 61, physical: 73 });
    const boosted = withCardBonus(ratings, [{ roundId: "month", kind: "month", periodKey: "2026-10", publishedAt: 1000, expiresAt: 3000 }], 2000);
    const stats = toFootballShieldStats(boosted.ratings);
    expect(stats.pace).toBe(99);
    expect(stats.shooting).toBe(89);
    expect(averageFootballShieldRating(stats)).toBe(boosted.overall);
    expect(averageFootballShieldRating(stats)).toBe(ratingOverall(boosted.ratings));
  });

  it("keeps missing scores missing in both the card and server mean", () => {
    const incomplete = { snl: 80, sch: 80, pas: 80, dri: 80, vrd: 80 };
    expect(toFootballShieldStats(incomplete).physical).toBeUndefined();
    expect(averageFootballShieldRating(toFootballShieldStats(incomplete))).toBeNull();
    expect(ratingOverall(incomplete)).toBeNull();
  });

  it("allows zero only in design examples, not as a saved coach assessment", () => {
    const zeros = { snl: 0, sch: 0, pas: 0, dri: 0, vrd: 0, fys: 0 };
    expect(averageFootballShieldRating(toFootballShieldStats(zeros))).toBe(0);
    expect(isFcAssessment(zeros)).toBe(false);
    expect(ratingOverall(zeros)).toBeNull();
  });
});
