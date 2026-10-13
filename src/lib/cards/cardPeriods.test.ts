import { describe, expect, it } from "vitest";
import { amsterdamLocalToUtc, cardAwardExpiresAt, cardPeriodKey } from "./cardPeriods";

describe("Amsterdam card periods", () => {
  it("uses local Monday and calendar month, even near UTC midnight/year boundaries", () => {
    expect(cardPeriodKey(Date.parse("2026-10-11T22:30:00Z"), "week")).toBe("2026-10-12");
    expect(cardPeriodKey(Date.parse("2026-09-30T22:30:00Z"), "month")).toBe("2026-10");
    expect(cardPeriodKey(Date.parse("2027-01-01T12:00:00Z"), "week")).toBe("2026-12-28");
  });
  it("keeps wall time when a week crosses either DST transition", () => {
    expect(new Date(cardAwardExpiresAt(Date.parse("2026-10-24T10:00:00Z"), "week")).toISOString()).toBe("2026-10-31T11:00:00.000Z");
    expect(new Date(cardAwardExpiresAt(Date.parse("2026-03-28T11:00:00Z"), "week")).toISOString()).toBe("2026-04-04T10:00:00.000Z");
  });
  it("clamps monthly expiry to month end and supports leap years", () => {
    expect(new Date(cardAwardExpiresAt(Date.parse("2027-01-31T11:00:00Z"), "month")).toISOString()).toBe("2027-02-28T11:00:00.000Z");
    expect(new Date(cardAwardExpiresAt(Date.parse("2028-01-31T11:00:00Z"), "month")).toISOString()).toBe("2028-02-29T11:00:00.000Z");
  });
  it("does not parse browser-local times or accept arbitrary strings", () => {
    expect(new Date(amsterdamLocalToUtc("2026-10-11T12:00")).toISOString()).toBe("2026-10-11T10:00:00.000Z");
    expect(Number.isNaN(amsterdamLocalToUtc("tomorrow"))).toBe(true);
    expect(Number.isNaN(amsterdamLocalToUtc("2026-02-30T12:00"))).toBe(true);
    expect(Number.isNaN(amsterdamLocalToUtc("2026-10-11T24:00"))).toBe(true);
  });

  it("resolves missing and repeated local times deterministically at DST", () => {
    expect(new Date(amsterdamLocalToUtc("2026-03-29T02:30")).toISOString()).toBe("2026-03-29T01:30:00.000Z");
    expect(new Date(amsterdamLocalToUtc("2026-10-25T02:30")).toISOString()).toBe("2026-10-25T01:30:00.000Z");
    expect(new Date(cardAwardExpiresAt(Date.parse("2026-03-22T01:30:00.123Z"), "week")).toISOString()).toBe("2026-03-29T01:30:00.123Z");
  });
});
