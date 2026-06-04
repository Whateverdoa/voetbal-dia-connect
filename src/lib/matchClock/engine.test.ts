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
