import { describe, expect, it } from "vitest";
import { PLAY_STYLES, isFcAssessment, isFcRatings, ratingOverall, ratingSpread, validPlayStyleIds, withCardBonus, type FcRatings, type CardRecognition } from "./fc27";

const ratings: FcRatings = { snl: 81, sch: 84, pas: 79, dri: 82, vrd: 61, fys: 73 };
const flat = (score: number): FcRatings => ({ snl: score, sch: score, pas: score, dri: score, vrd: score, fys: score });
const award = (kind: "week" | "month"): CardRecognition => ({ roundId: kind, kind, periodKey: "2026-10", publishedAt: 100, expiresAt: 200 });

describe("FC card assessments", () => {
  it("uses the rounded six-score average, independent of XP and card examples", () => {
    expect(ratingOverall(ratings)).toBe(77);
    expect(ratingOverall(flat(80))).toBe(80);
    expect(ratingOverall({ ...flat(80), snl: 83 })).toBe(81);
  });
  it("does not invent missing, partial, fractional or out-of-range assessments", () => {
    for (const value of [null, undefined, {}, { snl: 80 }, flat(0), flat(100), flat(80.5), flat(NaN)]) expect(isFcRatings(value)).toBe(false);
    expect(ratingOverall(null)).toBeNull();
  });
  it("caps individual bonuses and recalculates rather than incrementing the overall", () => {
    const input = { ...flat(99), snl: 90 };
    const result = withCardBonus(input, [award("week"), award("month")], 150);
    expect(result.bonus).toBe(5);
    expect(result.kind).toBe("month");
    expect(result.ratings).toEqual({ ...flat(99), snl: 95 });
    expect(result.overall).toBe(98);
    expect(input.snl).toBe(90);
  });
  it("preserves partial assessments without inventing scores or an overall", () => {
    expect(isFcAssessment({ snl: 80, pas: 85 })).toBe(true);
    expect(isFcAssessment({ snl: 80.5 })).toBe(false);
    expect(isFcAssessment({ overall: 80 })).toBe(false);
    expect(ratingOverall({ snl: 80, pas: 85 })).toBeNull();
    expect(withCardBonus({ snl: 80, pas: 98 }, [award("month")], 150)).toMatchObject({ ratings: { snl: 85, pas: 99 }, overall: null });
    expect(ratingSpread([{ fcRatings: flat(80) }, { fcRatings: { snl: 99 } }])).toBeNull();
  });
  it("expires precisely at the boundary and never boosts unassessed players", () => {
    expect(withCardBonus(flat(80), [award("week")], 199).overall).toBe(82);
    expect(withCardBonus(flat(80), [award("week")], 200).overall).toBe(80);
    expect(withCardBonus(flat(80), [award("week")], 99).bonus).toBe(0);
    expect(withCardBonus(null, [award("month")], 150).overall).toBeNull();
  });
  it("warns only above ten base points, ignoring inactive and unassessed players", () => {
    expect(ratingSpread([{ fcRatings: flat(80) }, { fcRatings: flat(90) }])?.warning).toBe(false);
    expect(ratingSpread([{ fcRatings: flat(80) }, { fcRatings: flat(91) }])?.warning).toBe(true);
    expect(ratingSpread([{ fcRatings: flat(80) }, { fcRatings: flat(99), active: false }, {}])).toBeNull();
  });
  it("provides twelve unique styles in six categories and accepts at most three known distinct IDs", () => {
    expect(PLAY_STYLES).toHaveLength(12);
    expect(new Set(PLAY_STYLES.map((style) => style.id)).size).toBe(12);
    expect(new Set(PLAY_STYLES.map((style) => style.category)).size).toBe(6);
    expect(PLAY_STYLES.every((style) => style.name && style.description)).toBe(true);
    expect(validPlayStyleIds([])).toBe(true);
    expect(validPlayStyleIds(["placed_ball", "dribbler", "tireless"])).toBe(true);
    expect(validPlayStyleIds(["placed_ball", "placed_ball"])).toBe(false);
    expect(validPlayStyleIds(["unknown"])).toBe(false);
    expect(validPlayStyleIds(PLAY_STYLES.slice(0, 4).map((style) => style.id))).toBe(false);
  });
});
