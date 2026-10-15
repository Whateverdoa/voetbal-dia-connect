import { describe, expect, it } from "vitest";
import { computeElapsedMs, formatElapsed, getQuarterBaseMs } from "./engine";

describe("matchClock engine", () => {
  it("formats elapsed time as MM:SS", () => {
    expect(formatElapsed(65_000)).toBe("01:05");
  });

  it("anchors quarters on nominal match time", () => {
    expect(
      getQuarterBaseMs({
        currentQuarter: 3,
        quarterCount: 4,
        regulationDurationMinutes: 60,
      })
    ).toBe(30 * 60 * 1000);
  });

  it("computes live elapsed without subtracting interruptions", () => {
    expect(
      computeElapsedMs(
        {
          currentQuarter: 1,
          quarterCount: 4,
          quarterStartedAt: 1_000,
          status: "live",
        },
        121_000
      )
    ).toBe(120_000);
  });

  it("returns frozen clock during halftime", () => {
    expect(
      computeElapsedMs(
        {
          currentQuarter: 2,
          quarterCount: 4,
          frozenClockMs: 16 * 60 * 1000 + 12_000,
          status: "halftime",
        },
        999_000
      )
    ).toBe(972_000);
  });

  it("has no display value before kickoff", () => {
    expect(
      computeElapsedMs(
        {
          currentQuarter: 1,
          quarterCount: 4,
          status: "scheduled",
        },
        999_000
      )
    ).toBeNull();
  });
});

describe("opt-in bounded public clock", () => {
 it.each([0, 10, 30])("caps after 600 minutes with margin %i, leaving the legacy path unchanged", margin => {
  const snapshot = { currentQuarter: 1, quarterCount: 2, status: "live" as const, quarterStartedAt: 1000 };
  const limitElapsedMs = (30 + margin) * 60000;
  expect(computeElapsedMs({ ...snapshot, refereeClock: { elapsedMs: 0, runningSince: 1000, limitElapsedMs } }, 1000 + 600 * 60000)).toBe(limitElapsedMs);
  expect(computeElapsedMs(snapshot, 1000 + 600 * 60000)).toBe(600 * 60000);
 });
 it("does not count a real pause twice or advance a safety pause", () => {
  expect(computeElapsedMs({ currentQuarter: 1, quarterCount: 2, status: "live", refereeClock: { elapsedMs: 120000, runningSince: null, limitElapsedMs: 2400000 } }, 600 * 60000)).toBe(120000);
 });
});
