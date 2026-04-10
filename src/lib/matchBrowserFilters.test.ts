import { describe, expect, it } from "vitest";
import {
  filterMatchesForBrowser,
  getCalendarWeekRange,
  getWeekendWindow,
} from "./matchBrowserFilters";
import type { PublicMatch } from "@/types/publicMatch";

const base = (over: Partial<PublicMatch>): PublicMatch =>
  ({
    _id: "m1",
    publicCode: "ABC123",
    opponent: "Z",
    isHome: true,
    status: "scheduled",
    homeScore: 0,
    awayScore: 0,
    currentQuarter: 1,
    quarterCount: 4,
    teamName: "Team A",
    clubName: "Club",
    ...over,
  }) as PublicMatch;

describe("filterMatchesForBrowser", () => {
  it("filters by team name (case-insensitive)", () => {
    const matches = [
      base({ _id: "1", teamName: "JO12-1", opponent: "X" }),
      base({ _id: "2", teamName: "JO13-1", opponent: "Y" }),
    ];
    const out = filterMatchesForBrowser(matches, "jo12", "all", "all");
    expect(out).toHaveLength(1);
    expect(out[0]._id).toBe("1");
  });

  it("includes live matches regardless of time filter", () => {
    const now = new Date("2026-04-10T12:00:00").getTime();
    const matches = [
      base({
        _id: "live",
        status: "live",
        scheduledAt: now - 86400000 * 30,
      }),
    ];
    const out = filterMatchesForBrowser(matches, "", "today", "all", now);
    expect(out).toHaveLength(1);
  });

  it("filters by thuis (clubteam home) only", () => {
    const now = Date.now();
    const matches = [
      base({ _id: "h", isHome: true }),
      base({ _id: "a", isHome: false }),
    ];
    const out = filterMatchesForBrowser(matches, "", "all", "home", now);
    expect(out).toHaveLength(1);
    expect(out[0]._id).toBe("h");
  });

  it("filters by uit (clubteam away) only", () => {
    const now = Date.now();
    const matches = [
      base({ _id: "h", isHome: true }),
      base({ _id: "a", isHome: false }),
    ];
    const out = filterMatchesForBrowser(matches, "", "all", "away", now);
    expect(out).toHaveLength(1);
    expect(out[0]._id).toBe("a");
  });
});

describe("getWeekendWindow", () => {
  it("returns a 3-day window from Friday 00:00", () => {
    const friday = new Date("2026-04-10T12:00:00");
    const { from, to } = getWeekendWindow(friday.getTime());
    const fromDate = new Date(from);
    expect(fromDate.getDay()).toBe(5);
    expect(to - from).toBeGreaterThan(0);
  });
});

describe("getCalendarWeekRange", () => {
  it("spans Monday to Sunday", () => {
    const wed = new Date("2026-04-08T15:00:00").getTime();
    const { from, to } = getCalendarWeekRange(wed);
    expect(new Date(from).getDay()).toBe(1);
    expect(new Date(to).getDay()).toBe(0);
  });
});
