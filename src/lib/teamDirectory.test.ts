import { describe, expect, it } from "vitest";
import {
  filterTeams,
  groupTeamsByCategory,
  OTHER_CATEGORY,
  type DirectoryTeam,
} from "./teamDirectory";

function team(name: string, slug: string): DirectoryTeam {
  return {
    id: slug,
    name,
    slug,
    clubName: "DIA",
    logoUrl: null,
    hasStanding: true,
  };
}

const teams = [
  team("JO13-2", "jo13-2"),
  team("JO13-1", "jo13-1"),
  team("JO8-3", "jo8-3"),
  team("MO15-1", "mo15-1"),
  team("Zondag 1", "zo1"),
  team("35+1", "35-1"),
];

describe("filterTeams", () => {
  it("returns everything for an empty search", () => {
    expect(filterTeams(teams, "  ")).toHaveLength(teams.length);
  });

  it("matches regardless of case, spaces and dashes", () => {
    expect(filterTeams(teams, "jo 13").map((t) => t.name)).toEqual([
      "JO13-2",
      "JO13-1",
    ]);
    expect(filterTeams(teams, "JO13-1").map((t) => t.name)).toEqual(["JO13-1"]);
  });

  it("matches on slug as well", () => {
    expect(filterTeams(teams, "zo1").map((t) => t.name)).toEqual(["Zondag 1"]);
  });

  it("returns nothing for an unknown team", () => {
    expect(filterTeams(teams, "jo99")).toEqual([]);
  });
});

describe("groupTeamsByCategory", () => {
  it("groups youth teams by age category and sorts numerically", () => {
    const groups = groupTeamsByCategory(teams);

    expect(groups.map((g) => g.category)).toEqual([
      "JO8",
      "JO13",
      "MO15",
      OTHER_CATEGORY,
    ]);
    expect(groups[1]!.teams.map((t) => t.name)).toEqual(["JO13-2", "JO13-1"]);
  });

  it("puts teams without an age prefix last", () => {
    const groups = groupTeamsByCategory(teams);
    const last = groups.at(-1)!;

    expect(last.category).toBe(OTHER_CATEGORY);
    expect(last.teams.map((t) => t.name)).toEqual(["Zondag 1", "35+1"]);
  });
});
