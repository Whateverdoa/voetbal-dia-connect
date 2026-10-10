import { describe, expect, it } from "vitest";
import {
  mapPouleAssignments,
  mapStandingRows,
  type RawPoulestandRow,
  type RawSportlinkTeam,
} from "./sportlinkStandingsMapper";

describe("mapPouleAssignments", () => {
  it("maps a bond team onto our own slug", () => {
    const rows: RawSportlinkTeam[] = [
      {
        teamcode: 143898,
        poulecode: 833832,
        teamnaam: "DIA O13-2JM",
        competitienaam: "0307 Onder 13 Zwaluwen Jeugd (1e fase)",
        klassepoule: "2e klasse Zwaluwen Jeugd (1e fase) 04",
        competitiesoort: "regulier",
      },
    ];

    expect(mapPouleAssignments(rows)).toEqual([
      {
        teamSlug: "jo13-2",
        poulecode: "833832",
        competitionName: "0307 Onder 13 Zwaluwen Jeugd (1e fase)",
        klassepoule: "2e klasse Zwaluwen Jeugd (1e fase) 04",
        sportlinkTeamName: "DIA O13-2JM",
      },
    ]);
  });

  it("skips local teams without a poulecode and cup entries", () => {
    const rows: RawSportlinkTeam[] = [
      { teamnaam: "JO13-2", poulecode: null, competitiesoort: "-" },
      {
        teamnaam: "DIA 1",
        poulecode: 830724,
        competitienaam: "Mannen KNVB beker Amateurs poulefase",
        competitiesoort: "beker",
      },
    ];

    expect(mapPouleAssignments(rows)).toEqual([]);
  });

  it("keeps the newest poule when a team plays several fases", () => {
    const rows: RawSportlinkTeam[] = [
      {
        teamnaam: "DIA O13-1",
        poulecode: 833811,
        klassepoule: "1e klasse 12",
        competitiesoort: "regulier",
      },
      {
        teamnaam: "DIA O13-1",
        poulecode: 899000,
        klassepoule: "1e klasse 03",
        competitiesoort: "regulier",
      },
    ];

    const result = mapPouleAssignments(rows);
    expect(result).toHaveLength(1);
    expect(result[0]!.poulecode).toBe("899000");
    expect(result[0]!.klassepoule).toBe("1e klasse 03");
  });

  it("falls back to klasse when klassepoule is missing", () => {
    const rows: RawSportlinkTeam[] = [
      {
        teamnaam: "DIA O10-1",
        poulecode: 1,
        klasse: "3e klasse",
        competitiesoort: "regulier",
      },
    ];

    expect(mapPouleAssignments(rows)[0]!.klassepoule).toBe("3e klasse");
  });
});

describe("mapStandingRows", () => {
  const row: RawPoulestandRow = {
    positie: 4,
    teamnaam: "DIA O13-2JM",
    clublogo: "https://binaries.sportlink.com/logo.png",
    gespeeldewedstrijden: 1,
    gewonnen: 0,
    gelijk: 0,
    verloren: 1,
    doelpuntenvoor: 2,
    doelpuntentegen: 5,
    doelsaldo: -3,
    punten: 0,
    eigenteam: "true",
  };

  it("normalises a Sportlink row", () => {
    expect(mapStandingRows([row])).toEqual([
      {
        position: 4,
        teamName: "DIA O13-2JM",
        clubLogoUrl: "https://binaries.sportlink.com/logo.png",
        played: 1,
        won: 0,
        drawn: 0,
        lost: 1,
        goalsFor: 2,
        goalsAgainst: 5,
        goalDifference: -3,
        points: 0,
        isOwnClub: true,
      },
    ]);
  });

  it("sorts by position and drops nameless rows", () => {
    const result = mapStandingRows([
      { ...row, positie: 3, teamnaam: "C" },
      { ...row, positie: 1, teamnaam: "A" },
      { ...row, teamnaam: "" },
      { ...row, positie: 2, teamnaam: "B" },
    ]);

    expect(result.map((r) => r.teamName)).toEqual(["A", "B", "C"]);
  });

  it("treats a missing logo as absent and eigenteam false as another club", () => {
    const [mapped] = mapStandingRows([
      { ...row, clublogo: null, eigenteam: "false" },
    ]);

    expect(mapped!.clubLogoUrl).toBeUndefined();
    expect(mapped!.isOwnClub).toBe(false);
  });
});
