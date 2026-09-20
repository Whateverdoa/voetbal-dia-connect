import { describe, expect, it } from "vitest";
import {
  isCurrentSeasonTeam,
  isYouthTeamSlug,
  teamNameFromSlug,
} from "./seasonYouthTeams";

describe("isYouthTeamSlug", () => {
  it("matches JO/MO competition teams", () => {
    expect(isYouthTeamSlug("jo13-2")).toBe(true);
    expect(isYouthTeamSlug("MO20-1")).toBe(true);
    expect(isYouthTeamSlug("jo8-5")).toBe(true);
  });

  it("leaves seniors, sandbox and training teams out", () => {
    expect(isYouthTeamSlug("zo1")).toBe(false);
    expect(isYouthTeamSlug("vr1")).toBe(false);
    expect(isYouthTeamSlug("35-1")).toBe(false);
    expect(isYouthTeamSlug("g-team")).toBe(false);
    expect(isYouthTeamSlug("test-sandbox")).toBe(false);
    expect(isYouthTeamSlug("trainingsteam")).toBe(false);
  });
});

describe("isCurrentSeasonTeam", () => {
  it("treats missing active as current", () => {
    expect(isCurrentSeasonTeam({})).toBe(true);
    expect(isCurrentSeasonTeam({ active: true })).toBe(true);
    expect(isCurrentSeasonTeam({ active: false })).toBe(false);
  });
});

describe("teamNameFromSlug", () => {
  it("uppercases official display names", () => {
    expect(teamNameFromSlug("jo17-3")).toBe("JO17-3");
    expect(teamNameFromSlug("mo20-1")).toBe("MO20-1");
  });
});
