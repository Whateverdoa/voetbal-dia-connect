import { describe, expect, it } from "vitest";
import {
  hasScheduleOverlap,
  intervalsOverlap,
  isQualificationEligible,
} from "@/lib/referee/eligibility";
import {
  buildClaimOpenEmail,
  buildUnassignedListWhatsApp,
} from "@/lib/referee/messageTemplates";
import { getDefaultClaimWindowClosesAt, getPlayWeekStartMs } from "@/lib/referee/playWeek";

describe("referee eligibility", () => {
  it("allows geschikt tags only", () => {
    expect(isQualificationEligible("JO12-1", 4, ["JO12", "8v8"])).toBe(true);
    expect(isQualificationEligible("JO12-1", 4, ["JO16"])).toBe(false);
    expect(isQualificationEligible("JO12-1", 4, [])).toBe(false);
  });

  it("detects overlapping intervals", () => {
    expect(intervalsOverlap(0, 100, 50, 150)).toBe(true);
    expect(intervalsOverlap(0, 100, 100, 200)).toBe(false);
    expect(
      hasScheduleOverlap(
        { scheduledAt: 1_000, regulationDurationMinutes: 60 },
        [{ scheduledAt: 1_000 + 30 * 60 * 1000, regulationDurationMinutes: 60 }]
      )
    ).toBe(true);
  });
});

describe("referee message templates", () => {
  it("builds claim-open e-mail", () => {
    const mail = buildClaimOpenEmail({
      refereeName: "Jan",
      appUrl: "https://example.com/",
      weekLabel: "10-16 03",
    });
    expect(mail.subject).toContain("claimronde");
    expect(mail.body).toContain("https://example.com/scheidsrechter");
  });

  it("builds empty unassigned list message", () => {
    const text = buildUnassignedListWhatsApp({
      weekLabel: "test",
      unassigned: [],
    });
    expect(text).toContain("alle wedstrijden hebben een scheidsrechter");
  });
});

describe("play week", () => {
  it("returns Monday start and Wed 18:00 close after Monday", () => {
    // 2026-08-03 is a Monday in many TZ; use a fixed UTC noon Wednesday
    const wed = Date.parse("2026-08-05T12:00:00+02:00");
    const monday = getPlayWeekStartMs(wed);
    const closes = getDefaultClaimWindowClosesAt(monday);
    expect(closes).toBeGreaterThan(monday);
    expect(closes - monday).toBeLessThan(4 * 24 * 60 * 60 * 1000);
  });
});
