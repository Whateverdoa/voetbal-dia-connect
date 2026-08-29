import { describe, expect, it } from "vitest";
import {
  levelFromXp,
  minutesToXp,
  rarityFromLevel,
  xpProgressInLevel,
  XP_GOAL,
  XP_ASSIST,
} from "./levels";

describe("gamification levels", () => {
  it("starts at level 1 with 0 XP", () => {
    expect(levelFromXp(0)).toBe(1);
  });

  it("reaches level 2 at 50 XP", () => {
    expect(levelFromXp(49)).toBe(1);
    expect(levelFromXp(50)).toBe(2);
  });

  it("maps rarity by level bands", () => {
    expect(rarityFromLevel(1)).toBe("common");
    expect(rarityFromLevel(8)).toBe("rare");
    expect(rarityFromLevel(15)).toBe("epic");
  });

  it("awards XP in 15-minute blocks", () => {
    expect(minutesToXp(0)).toBe(0);
    expect(minutesToXp(14)).toBe(0);
    expect(minutesToXp(15)).toBe(10);
    expect(minutesToXp(45)).toBe(30);
  });

  it("reports progress within a level", () => {
    const p = xpProgressInLevel(60);
    expect(p.level).toBe(2);
    expect(p.intoLevel).toBe(10);
    expect(p.needed).toBeGreaterThan(0);
  });

  it("uses fixed goal/assist XP constants", () => {
    expect(XP_GOAL).toBe(25);
    expect(XP_ASSIST).toBe(15);
  });
});
