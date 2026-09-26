import { describe, expect, it } from "vitest";
import {
  cardPersonDisplay,
  compactDefined,
  findRosterPlayer,
  formatReportedPerson,
  hasCardIdentity,
} from "./cardEntry";

const roster = [
  { playerId: "p1", name: "Jan Jansen", number: 10 },
  { playerId: "p2", name: "Piet", number: 7 },
];

describe("findRosterPlayer", () => {
  it("matches playerId first", () => {
    expect(
      findRosterPlayer(roster, { playerId: "p2", reportedNumber: 10 })?.playerId,
    ).toBe("p2");
  });

  it("matches a unique shirt number", () => {
    expect(findRosterPlayer(roster, { reportedNumber: 10 })?.name).toBe(
      "Jan Jansen",
    );
  });

  it("matches an exact name", () => {
    expect(findRosterPlayer(roster, { reportedName: "piet" })?.playerId).toBe(
      "p2",
    );
  });

  it("does not guess on a partial name", () => {
    expect(findRosterPlayer(roster, { reportedName: "Jan" })).toBeNull();
  });
});

describe("card labels", () => {
  it("formats number and name", () => {
    expect(
      formatReportedPerson({ reportedNumber: 9, reportedName: "Vos" }),
    ).toBe("#9 Vos");
  });

  it("prefers roster name in the timeline", () => {
    expect(
      cardPersonDisplay({
        playerName: "Jan Jansen",
        reportedNumber: 10,
      }),
    ).toBe("Jan Jansen");
  });

  it("requires some identity", () => {
    expect(hasCardIdentity({})).toBe(false);
    expect(hasCardIdentity({ reportedNumber: 4 })).toBe(true);
  });

  it("drops undefined keys before a Convex insert", () => {
    expect(
      compactDefined({
        reportedName: undefined,
        reportedNumber: 9,
        extra: undefined,
      }),
    ).toEqual({ reportedNumber: 9 });
  });
});
