import { describe, expect, it } from "vitest";
import {
  buildQuarterReminderMessage,
  detectNextQuarterReminder,
  getExtraMinutesPastNominal,
  getNominalQuarterEndMs,
  quarterReminderKey,
} from "./quarterEndReminder";
import type { MatchClockSnapshot } from "./types";

const liveQ1: MatchClockSnapshot = {
  currentQuarter: 1,
  quarterCount: 4,
  regulationDurationMinutes: 60,
  quarterStartedAt: 0,
  status: "live",
};

describe("quarterEndReminder", () => {
  it("nominal end for Q1 of 4x15 is 15:00", () => {
    expect(getNominalQuarterEndMs(liveQ1)).toBe(15 * 60 * 1000);
  });

  it("fires nominal reminder once past quarter duration", () => {
    const fired = new Set<string>();
    expect(
      detectNextQuarterReminder(15 * 60 * 1000, liveQ1, fired)
    ).toBe("nominal");
    fired.add(quarterReminderKey(1, "nominal"));
    expect(detectNextQuarterReminder(15 * 60 * 1000 + 500, liveQ1, fired)).toBe(
      null
    );
  });

  it("fires extra minute reminders in order", () => {
    const fired = new Set([quarterReminderKey(1, "nominal")]);
    expect(
      detectNextQuarterReminder(16 * 60 * 1000, liveQ1, fired)
    ).toBe("extra_1");
    fired.add(quarterReminderKey(1, "extra_1"));
    expect(
      detectNextQuarterReminder(17 * 60 * 1000, liveQ1, fired)
    ).toBe("extra_2");
  });

  it("skips nominal if already in extra time but nominal not fired", () => {
    const fired = new Set<string>();
    expect(
      detectNextQuarterReminder(16 * 60 * 1000, liveQ1, fired)
    ).toBe("nominal");
  });

  it("computes extra minutes past nominal end", () => {
    expect(getExtraMinutesPastNominal(16 * 60 * 1000, 15 * 60 * 1000)).toBe(1);
  });

  it("uses helft wording for two-half matches", () => {
    expect(buildQuarterReminderMessage("nominal", 1, 2)).toContain("Helft 1");
  });
});
