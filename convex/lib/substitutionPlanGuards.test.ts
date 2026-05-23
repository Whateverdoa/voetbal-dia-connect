import { describe, expect, it } from "vitest";
import { assertCanExecutePlannedSubstitution } from "./substitutionPlanGuards";

describe("assertCanExecutePlannedSubstitution", () => {
  it("rejects planned substitutions before kickoff", () => {
    expect(() => assertCanExecutePlannedSubstitution("scheduled")).toThrow(
      "Geplande wissels kun je pas tijdens de wedstrijd bevestigen"
    );
    expect(() => assertCanExecutePlannedSubstitution("lineup")).toThrow(
      "Geplande wissels kun je pas tijdens de wedstrijd bevestigen"
    );
  });

  it("allows execution during live play and halftime", () => {
    expect(() => assertCanExecutePlannedSubstitution("live")).not.toThrow();
    expect(() => assertCanExecutePlannedSubstitution("halftime")).not.toThrow();
  });
});
