import { describe, expect, it } from "vitest";
import {
  describeGoalEvent,
  describeOwnGoal,
  ownGoalBeneficiary,
} from "./goalEventText";

describe("ownGoalBeneficiary", () => {
  it("credits the other team", () => {
    expect(ownGoalBeneficiary("home")).toBe("away");
    expect(ownGoalBeneficiary("away")).toBe("home");
  });
});

describe("describeOwnGoal", () => {
  it("names the kicker team and who is credited", () => {
    expect(
      describeOwnGoal(
        { isOwnGoal: true, isOpponentGoal: true },
        "DIA JO13-1",
        "VOAB",
      ),
    ).toBe("Eigen doelpunt DIA JO13-1 · telt voor VOAB");
  });

  it("adds optional shirt from the note", () => {
    expect(
      describeOwnGoal(
        {
          isOwnGoal: true,
          isOpponentGoal: false,
          note: "Rugnummer: 4",
        },
        "DIA JO13-1",
        "VOAB",
      ),
    ).toBe("Eigen doelpunt VOAB #4 · telt voor DIA JO13-1");
  });
});

describe("describeGoalEvent", () => {
  it("keeps a regular team goal with set piece", () => {
    expect(
      describeGoalEvent(
        { playerName: "Jan", assistKind: "penalty" },
        "TEST Sandbox",
        "VOAB",
      ),
    ).toBe("Doelpunt Jan (TEST Sandbox) · Penalty");
  });

  it("links a referee goal to the shirt number", () => {
    expect(
      describeGoalEvent(
        { note: "Rugnummer: 7", assistKind: "corner" },
        "TEST Sandbox",
        "VOAB",
      ),
    ).toBe("Doelpunt #7 (TEST Sandbox) · Hoekschop");
  });
});
