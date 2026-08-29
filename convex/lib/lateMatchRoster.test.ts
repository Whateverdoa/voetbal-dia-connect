import { describe, expect, it } from "vitest";
import {
  assertMatchAcceptsRosterAdd,
  canAddPlayerToMatchStatus,
  regulationMinuteAtQuarterStart,
  equalShareMinutes,
  regulationEndClock,
  remainingRegulationMinutes,
  secondHalfStartQuarter,
} from "./lateMatchRoster";

describe("lateMatchRoster", () => {
  it("allows add before, during, and after the match", () => {
    expect(canAddPlayerToMatchStatus("scheduled")).toBe(true);
    expect(canAddPlayerToMatchStatus("lineup")).toBe(true);
    expect(canAddPlayerToMatchStatus("live")).toBe(true);
    expect(canAddPlayerToMatchStatus("halftime")).toBe(true);
    expect(canAddPlayerToMatchStatus("finished")).toBe(true);
  });

  it("rejects unknown statuses", () => {
    expect(canAddPlayerToMatchStatus("cancelled")).toBe(false);
    expect(() => assertMatchAcceptsRosterAdd("cancelled")).toThrow(
      "Spelers kunnen niet worden toegevoegd aan deze wedstrijd",
    );
  });

  it("starts the second half at quarter 3 of 4", () => {
    expect(secondHalfStartQuarter(4)).toBe(3);
    expect(secondHalfStartQuarter(2)).toBe(2);
  });

  it("maps quarter start to regulation minutes", () => {
    expect(regulationMinuteAtQuarterStart(3, 4, 60)).toBe(30);
    expect(remainingRegulationMinutes(3, 4, 60)).toBe(30);
  });

  it("splits 11v11 / 60 minutes equally across 16 available players", () => {
    expect(equalShareMinutes(11, 60, 16)).toBe(41.3);
    expect(equalShareMinutes(11, 60, 0)).toBe(0);
  });

  it("freezes a 60-minute match at 60:00 after a full last quarter", () => {
    expect(regulationEndClock(60)).toEqual({
      displayMinute: 60,
      gameSecond: 3600,
      matchMs: 3_600_000,
      frozenClockMs: 3_600_000,
    });
  });
});
