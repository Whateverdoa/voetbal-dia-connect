import { describe, expect, it } from "vitest";
import {
  describeGoalEnrichment,
  formatAssistLine,
  resolveAssistKindForSubmit,
} from "./assistKind";

describe("formatAssistLine", () => {
  it("formats a regular pass with a player", () => {
    expect(formatAssistLine("Piet", "pass")).toBe("Assist: Piet");
    expect(formatAssistLine("Piet")).toBe("Assist: Piet");
  });

  it("formats a corner or free kick with or without a player", () => {
    expect(formatAssistLine("Piet", "corner")).toBe("Hoekschop: Piet");
    expect(formatAssistLine(null, "corner")).toBe("Hoekschop");
    expect(formatAssistLine("Jan", "free_kick")).toBe("Vrije trap: Jan");
    expect(formatAssistLine(undefined, "free_kick")).toBe("Vrije trap");
  });

  it("returns null when there is no player and no set piece", () => {
    expect(formatAssistLine(null, "pass")).toBeNull();
    expect(formatAssistLine()).toBeNull();
  });
});

describe("resolveAssistKindForSubmit", () => {
  it("keeps set-piece kinds even without a player", () => {
    expect(resolveAssistKindForSubmit("corner", null)).toBe("corner");
    expect(resolveAssistKindForSubmit("free_kick", "p1")).toBe("free_kick");
  });

  it("sends pass only when a player is chosen", () => {
    expect(resolveAssistKindForSubmit("pass", "p1")).toBe("pass");
    expect(resolveAssistKindForSubmit("pass", null)).toBeUndefined();
    expect(resolveAssistKindForSubmit(null, "p1")).toBeUndefined();
  });
});

describe("describeGoalEnrichment", () => {
  it("describes a corner-only note without claiming scorer/assist", () => {
    expect(describeGoalEnrichment({ assistKind: "corner" })).toBe(
      "Hoekschop genoteerd"
    );
    expect(describeGoalEnrichment({ assistKind: "free_kick" })).toBe(
      "Vrije trap genoteerd"
    );
  });

  it("keeps the classic scorer+assist wording when both players are set", () => {
    expect(
      describeGoalEnrichment({
        scorerName: "Jan",
        assistName: "Piet",
        assistKind: "pass",
      })
    ).toBe("Scorer en assist toegevoegd");
  });
});
