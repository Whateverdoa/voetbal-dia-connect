import { describe, expect, it } from "vitest";
import {
  filterAssignmentBoardVenueMatches,
  getAssignmentClubTabs,
  getAssignmentDateKey,
  getAssignmentDateLabel,
  getAssignmentDateTabs,
  getQualificationState,
} from "./assignmentBoard";
import { filterAssignmentBoardDateWindow } from "./assignmentBoardWindowFilters";

describe("assignmentBoard helpers", () => {
  it("returns geschikt when match and referee tags overlap", () => {
    expect(getQualificationState(["JO12", "8v8"], ["basis", "8v8"])).toBe(
      "geschikt"
    );
  });

  it("returns onbekend when referee tags are missing", () => {
    expect(getQualificationState(["JO12", "8v8"], undefined)).toBe("onbekend");
  });

  it("returns mogelijk when referee tags do not overlap", () => {
    expect(getQualificationState(["JO12", "8v8"], ["JO16", "11v11"])).toBe(
      "mogelijk"
    );
  });

  it("groups clubs and speeldagen including ongepland, and can focus on home matches", () => {
    const march15 = new Date(2026, 2, 15, 9, 0).getTime();
    const march22 = new Date(2026, 2, 22, 11, 30).getTime();

    const matches = [
      {
        _id: "match-1",
        clubId: "club-1",
        clubName: "vv DIA",
        teamId: "team-1",
        teamName: "JO11-1",
        opponent: "Baronie",
        isHome: true,
        status: "scheduled",
        publicCode: "AAA111",
        scheduledAt: march22,
        refereeName: null,
        coachName: "Coach A",
        dateKey: getAssignmentDateKey(march22),
        dateLabel: getAssignmentDateLabel(march22),
        qualificationState: "onbekend" as const,
      },
      {
        _id: "match-2",
        clubId: "club-1",
        clubName: "vv DIA",
        teamId: "team-1",
        teamName: "JO11-1",
        opponent: "SCO",
        isHome: false,
        status: "live",
        publicCode: "BBB222",
        scheduledAt: march15,
        refereeName: "Ref A",
        coachName: "Coach A",
        dateKey: getAssignmentDateKey(march15),
        dateLabel: getAssignmentDateLabel(march15),
        qualificationState: "geschikt" as const,
      },
      {
        _id: "match-3",
        clubId: "club-1",
        clubName: "vv DIA",
        teamId: "team-2",
        teamName: "JO12-1",
        opponent: "Gilze",
        isHome: true,
        status: "scheduled",
        publicCode: "CCC333",
        refereeName: null,
        coachName: "Coach B",
        dateKey: getAssignmentDateKey(undefined),
        dateLabel: getAssignmentDateLabel(undefined),
        qualificationState: "onbekend" as const,
      },
      {
        _id: "match-4",
        clubId: "club-2",
        clubName: "Testclub",
        teamId: "team-3",
        teamName: "JO13-1",
        opponent: "TSC",
        isHome: true,
        status: "finished",
        publicCode: "DDD444",
        scheduledAt: march15,
        refereeName: "Ref B",
        coachName: "Coach C",
        dateKey: getAssignmentDateKey(march15),
        dateLabel: getAssignmentDateLabel(march15),
        qualificationState: "mogelijk" as const,
      },
    ];

    expect(getAssignmentClubTabs(matches)).toEqual([
      { key: "club-2", label: "Testclub", count: 1 },
      { key: "club-1", label: "vv DIA", count: 3 },
    ]);

    expect(getAssignmentDateTabs(matches, "club-1")).toEqual([
      {
        key: getAssignmentDateKey(march15),
        label: getAssignmentDateLabel(march15),
        count: 1,
      },
      {
        key: getAssignmentDateKey(march22),
        label: getAssignmentDateLabel(march22),
        count: 1,
      },
      { key: "ongepland", label: "Ongepland", count: 1 },
    ]);

    expect(filterAssignmentBoardVenueMatches(matches, "thuis")).toHaveLength(3);
  });

  it("applies the selected date window to finished matches too", () => {
    const fixedNow = new Date(2026, 2, 16, 10, 0).getTime(); // Monday, 16 March 2026
    const originalDateNow = Date.now;
    Date.now = () => fixedNow;
    try {
      const withinWeek = new Date(2026, 2, 18, 19, 30).getTime();
      const oldFinished = new Date(2026, 1, 2, 9, 0).getTime();

      const matches = [
        {
          _id: "match-live",
          clubId: "club-1",
          clubName: "vv DIA",
          teamId: "team-1",
          teamName: "JO12-1",
          opponent: "Live Opponent",
          isHome: true,
          status: "live",
          publicCode: "LIV111",
          refereeName: null,
          coachName: "Coach A",
          dateKey: "2026-03-16",
          dateLabel: "Ma 16 mrt",
          qualificationState: "onbekend" as const,
        },
        {
          _id: "match-finished-in-week",
          clubId: "club-1",
          clubName: "vv DIA",
          teamId: "team-1",
          teamName: "JO12-1",
          opponent: "Recent Opponent",
          isHome: true,
          status: "finished",
          publicCode: "FIN222",
          scheduledAt: withinWeek,
          refereeName: null,
          coachName: "Coach A",
          dateKey: "2026-03-18",
          dateLabel: "Wo 18 mrt",
          qualificationState: "onbekend" as const,
        },
        {
          _id: "match-finished-old",
          clubId: "club-1",
          clubName: "vv DIA",
          teamId: "team-1",
          teamName: "JO12-1",
          opponent: "Old Opponent",
          isHome: true,
          status: "finished",
          publicCode: "OLD333",
          scheduledAt: oldFinished,
          refereeName: null,
          coachName: "Coach A",
          dateKey: "2026-02-02",
          dateLabel: "Ma 2 feb",
          qualificationState: "onbekend" as const,
        },
      ];

      const currentWeek = filterAssignmentBoardDateWindow(matches, "huidige-speelweek");
      expect(currentWeek.map((match) => match._id)).toEqual([
        "match-live",
        "match-finished-in-week",
      ]);

      const all = filterAssignmentBoardDateWindow(matches, "alles");
      expect(all).toHaveLength(3);
    } finally {
      Date.now = originalDateNow;
    }
  });
});
