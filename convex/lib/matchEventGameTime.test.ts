import { describe, expect, it } from "vitest";
import {
  buildEventGameTimeStamp,
  computeQuarterOverrunSeconds,
  getEffectiveEventTime,
} from "./matchEventGameTime";

describe("matchEventGameTime", () => {
  const quarterStart = 1_000;

  it("computes a regular first-quarter minute", () => {
    const stamp = buildEventGameTimeStamp(
      {
        currentQuarter: 1,
        quarterCount: 4,
        quarterStartedAt: quarterStart,
        accumulatedPauseTime: 0,
        bankedOverrunSeconds: 0,
      },
      quarterStart + 10 * 60 * 1000
    );

    expect(stamp.gameSecond).toBe(600);
    expect(stamp.displayMinute).toBe(10);
    expect(stamp.displayExtraMinute).toBeUndefined();
  });

  it("anchors second quarter at 15 minutes despite banked overrun", () => {
    const stamp = buildEventGameTimeStamp(
      {
        currentQuarter: 2,
        quarterCount: 4,
        quarterStartedAt: quarterStart,
        accumulatedPauseTime: 0,
        bankedOverrunSeconds: 180,
      },
      quarterStart + 2 * 60 * 1000
    );

    expect(stamp.displayMinute).toBe(17);
    expect(stamp.displayExtraMinute).toBeUndefined();
  });

  it("shows 60+X in final quarter with banked and in-quarter overrun", () => {
    const stamp = buildEventGameTimeStamp(
      {
        currentQuarter: 4,
        quarterCount: 4,
        quarterStartedAt: quarterStart,
        accumulatedPauseTime: 0,
        bankedOverrunSeconds: 180,
      },
      quarterStart + 17 * 60 * 1000
    );

    expect(stamp.displayMinute).toBe(60);
    expect(stamp.displayExtraMinute).toBe(5);
  });

  it("uses pause timestamp as effective event time", () => {
    const effective = getEffectiveEventTime({ currentQuarter: 1, quarterCount: 4, pausedAt: 1234 }, 9999);
    expect(effective).toBe(1234);
  });

  it("computes quarter overrun seconds", () => {
    const overrun = computeQuarterOverrunSeconds(
      {
        currentQuarter: 1,
        quarterCount: 4,
        quarterStartedAt: quarterStart,
        accumulatedPauseTime: 0,
      },
      quarterStart + 16 * 60 * 1000
    );
    expect(overrun).toBe(60);
  });
});
