import { describe, expect, it } from "vitest";
import { assertCanExecutePlannedSubstitution } from "./substitutionPlanGuards";

describe("assertCanExecutePlannedSubstitution", () => {
  it("rejects pre-kickoff execution", () => {
    expect(() => assertCanExecutePlannedSubstitution("scheduled")).toThrow(
      "pas tijdens de wedstrijd"
    );
    expect(() => assertCanExecutePlannedSubstitution("lineup")).toThrow(
      "pas tijdens de wedstrijd"
    );
  });

  it("allows live and halftime execution", () => {
    expect(() => assertCanExecutePlannedSubstitution("live")).not.toThrow();
    expect(() => assertCanExecutePlannedSubstitution("halftime")).not.toThrow();
  });
});
