import { describe, expect, it } from "vitest";
import { rosterNeedsReplace } from "./matchRosterPolicy";

describe("rosterNeedsReplace", () => {
  it("is false when all players belong to the match team", () => {
    expect(rosterNeedsReplace("team-a", ["team-a", "team-a"])).toBe(false);
  });

  it("is true when any player belongs to another team", () => {
    expect(rosterNeedsReplace("team-b", ["team-a", "team-a"])).toBe(true);
  });

  it("is false for an empty lineup", () => {
    expect(rosterNeedsReplace("team-a", [])).toBe(false);
  });
});
