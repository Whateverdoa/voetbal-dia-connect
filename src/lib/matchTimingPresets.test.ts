import { describe, expect, it } from "vitest";
import {
  getBreakMinutesAfterQuarter,
  getBreakMinutesForTiming,
} from "./matchTimingPresets";

describe("matchTimingPresets break rules", () => {
  it("uses 3/15/3 minute breaks for 4x15 matches", () => {
    expect(getBreakMinutesAfterQuarter("q4_15", 1)).toBe(3);
    expect(getBreakMinutesAfterQuarter("q4_15", 2)).toBe(15);
    expect(getBreakMinutesAfterQuarter("q4_15", 3)).toBe(3);
    expect(getBreakMinutesAfterQuarter("q4_15", 4)).toBeNull();
  });

  it("uses 15 minute halftime for normal two-half matches", () => {
    expect(getBreakMinutesAfterQuarter("h2_30", 1)).toBe(15);
    expect(getBreakMinutesAfterQuarter("h2_45", 1)).toBe(15);
    expect(getBreakMinutesAfterQuarter("h2_30", 2)).toBeNull();
    expect(getBreakMinutesAfterQuarter("h2_45", 2)).toBeNull();
  });

  it("resolves break rules from match timing", () => {
    expect(getBreakMinutesForTiming(4, 60, 1)).toBe(3);
    expect(getBreakMinutesForTiming(2, 90, 1)).toBe(15);
    expect(getBreakMinutesForTiming(3, 60, 1)).toBeNull();
  });
});
