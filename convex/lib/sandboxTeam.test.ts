import { describe, expect, it } from "vitest";
import {
  isSandboxTeamSlug,
  SANDBOX_TEAM_SLUG,
} from "../../convex/lib/sandboxTeam";

describe("isSandboxTeamSlug", () => {
  it("matches test- prefix", () => {
    expect(isSandboxTeamSlug(SANDBOX_TEAM_SLUG)).toBe(true);
    expect(isSandboxTeamSlug("TEST-FOO")).toBe(true);
    expect(isSandboxTeamSlug(" jo13-2 ")).toBe(false);
    expect(isSandboxTeamSlug("testing")).toBe(false);
  });
});
