import { describe, it, expect } from "vitest";
import { MATCH_AGENT_TOOLS, MATCH_AGENT_COMMAND_MAP } from "./tools";

describe("MATCH_AGENT_TOOLS", () => {
  it("contains all required Fase 3 tools", () => {
    const names = MATCH_AGENT_TOOLS.map((tool) => tool.name);
    expect(names).toContain("stage_substitution");
    expect(names).toContain("confirm_substitution");
    expect(names).toContain("cancel_staged_substitution");
    expect(names).toContain("enrich_goal");
  });

  it("maps each required tool to the expected command", () => {
    expect(MATCH_AGENT_COMMAND_MAP.stage_substitution).toBe(
      "STAGE_SUBSTITUTION"
    );
    expect(MATCH_AGENT_COMMAND_MAP.confirm_substitution).toBe(
      "CONFIRM_SUBSTITUTION"
    );
    expect(MATCH_AGENT_COMMAND_MAP.cancel_staged_substitution).toBe(
      "CANCEL_STAGED_SUBSTITUTION"
    );
    expect(MATCH_AGENT_COMMAND_MAP.enrich_goal).toBe("ENRICH_GOAL");
  });
});
