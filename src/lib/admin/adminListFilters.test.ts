import { describe, expect, it } from "vitest";
import {
  filterCoaches,
  filterPlayers,
  filterTeamsBySearch,
  matchesSearch,
} from "./adminListFilters";

describe("adminListFilters", () => {
  it("matchesSearch ignores empty needle", () => {
    expect(matchesSearch(["Anna"], "")).toBe(true);
    expect(matchesSearch(["Anna"], "an")).toBe(true);
    expect(matchesSearch(["Anna"], "zz")).toBe(false);
  });

  it("filters coaches by team and search", () => {
    const coaches = [
      {
        name: "Anna",
        email: "a@dia.nl",
        teamIds: ["t1"],
        teams: [{ id: "t1", name: "JO12-1" }],
      },
      {
        name: "Bram",
        email: "b@dia.nl",
        teamIds: [],
        teams: [],
      },
    ];
    expect(
      filterCoaches(coaches, {
        search: "",
        teamId: "",
        teamLinkFilter: "zonder-team",
      }).map((c) => c.name)
    ).toEqual(["Bram"]);
    expect(
      filterCoaches(coaches, {
        search: "jo12",
        teamId: "",
        teamLinkFilter: "alle",
      }).map((c) => c.name)
    ).toEqual(["Anna"]);
  });

  it("filters players by active and position", () => {
    const players = [
      {
        name: "Sam",
        number: 9,
        active: true,
        positionPrimary: "ST",
        positionSecondary: undefined,
      },
      {
        name: "Tom",
        number: 1,
        active: false,
        positionPrimary: "GK",
        positionSecondary: undefined,
      },
    ];
    expect(
      filterPlayers(players, {
        search: "",
        activeFilter: "actief",
        position: "",
      }).map((p) => p.name)
    ).toEqual(["Sam"]);
    expect(
      filterPlayers(players, {
        search: "1",
        activeFilter: "alle",
        position: "GK",
      }).map((p) => p.name)
    ).toEqual(["Tom"]);
  });

  it("filters teams by name", () => {
    const teams = [
      { name: "JO12-1", clubName: "DIA" },
      { name: "JO13-2", clubName: "DIA" },
    ];
    expect(filterTeamsBySearch(teams, "jo13").map((t) => t.name)).toEqual([
      "JO13-2",
    ]);
  });
});
