import { describe, expect, it } from "vitest";
import { coachStandenHref } from "./coachStandenHref";

describe("coachStandenHref", () => {
  it("opens the first linked team stand", () => {
    expect(
      coachStandenHref([{ slug: "jo13-2" }, { slug: "jo12-1" }])
    ).toBe("/team/jo13-2?tab=stand");
  });

  it("falls back to the team directory", () => {
    expect(coachStandenHref([])).toBe("/teams");
  });
});
