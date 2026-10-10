import { describe, expect, it } from "vitest";
import {
  filterAdminMatches,
  filterAdminTeams,
  uniqueTeamsFromMatches,
} from "./adminViewFilters";

const matches = [
  {
    teamId: "t1",
    teamName: "JO12-1",
    opponent: "Zwaluwe 1",
    publicCode: "ABC123",
    status: "scheduled",
  },
  {
    teamId: "t2",
    teamName: "JO13-2",
    opponent: "UVV'40",
    publicCode: "XYZ789",
    status: "live",
  },
  {
    teamId: "t1",
    teamName: "JO12-1",
    opponent: "Terheijden",
    publicCode: "DEF456",
    status: "finished",
  },
];

describe("filterAdminMatches", () => {
  it("filters by team, status and search", () => {
    expect(
      filterAdminMatches(matches, {
        search: "",
        teamId: "t1",
        status: "alle",
      }),
    ).toHaveLength(2);

    expect(
      filterAdminMatches(matches, {
        search: "zwaluwe",
        teamId: "",
        status: "alle",
      }).map((match) => match.publicCode),
    ).toEqual(["ABC123"]);

    expect(
      filterAdminMatches(matches, {
        search: "",
        teamId: "",
        status: "actief",
      }).map((match) => match.teamName),
    ).toEqual(["JO13-2"]);
  });

  it("matches public code in search", () => {
    expect(
      filterAdminMatches(matches, {
        search: "xyz",
        teamId: "",
        status: "alle",
      }),
    ).toHaveLength(1);
  });
});

describe("filterAdminTeams", () => {
  const teams = [
    { id: "t1", name: "JO12-1" },
    { id: "t2", name: "JO13-2" },
    { id: "t3", name: "JO10-1" },
  ];

  it("keeps the selected team even without matches", () => {
    expect(filterAdminTeams(teams, [], "t3").map((team) => team.id)).toEqual([
      "t3",
    ]);
  });

  it("hides teams without remaining matches", () => {
    expect(
      filterAdminTeams(teams, [{ teamId: "t2" }], "").map((team) => team.id),
    ).toEqual(["t2"]);
  });
});

describe("uniqueTeamsFromMatches", () => {
  it("dedupes teams and sorts in Dutch", () => {
    expect(uniqueTeamsFromMatches(matches).map((team) => team.name)).toEqual([
      "JO12-1",
      "JO13-2",
    ]);
  });
});
