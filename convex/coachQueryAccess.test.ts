import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { readActiveReferees, readMatchesByTeam } from "./coachQueries";

const teamId = "team-a" as Id<"teams">;
type Row = Record<string, unknown> & { _id: string };

function fixture(email: string | null) {
  const tables: Record<string, Row[]> = {
    coaches: [{ _id: "coach", email: "coach@example.invalid", teamIds: [teamId], name: "Test Coach" }],
    referees: [
      { _id: "referee", email: "referee@example.invalid", name: "Test Referee", active: true, pin: "secret-pin", qualificationTags: ["jo13", "JO13"] },
      { _id: "inactive", email: "inactive@example.invalid", name: "Inactive", active: false },
    ],
    userAccess: [{ _id: "access", email: "admin@example.invalid", roles: ["admin"], active: true }],
    matches: [{ _id: "match", _creationTime: 10, teamId, publicCode: "PUBLIC", opponent: "Test Opponent",
      isHome: true, status: "scheduled", currentQuarter: 1, quarterCount: 2, regulationDurationMinutes: 60,
      homeScore: 0, awayScore: 0, showLineup: true, scheduledAt: 20, createdAt: 10,
      coachId: "coach", leadCoachId: "coach", refereeId: "referee", coachPin: "secret-match-pin" }],
  };
  const query = vi.fn((name: string) => {
    const conditions: Array<[string, unknown]> = [];
    const eq = (field: string, value: unknown) => { conditions.push([field, value]); return { eq }; };
    const rows = () => (tables[name] ?? []).filter(row => conditions.every(([field, value]) => row[field] === value));
    const result = {
      withIndex: (_index: string, configure?: (q: { eq: typeof eq }) => unknown) => { configure?.({ eq }); return result; },
      order: () => result,
      first: async () => rows()[0] ?? null,
      take: vi.fn(async (limit: number) => rows().slice(0, limit)),
    };
    return result;
  });
  const ctx = {
    auth: { getUserIdentity: async () => email ? { email, subject: email, tokenIdentifier: `test|${email}` } : null },
    db: { query, get: async (id: string) => Object.values(tables).flat().find(row => row._id === id) ?? null },
  } as unknown as QueryCtx;
  return { ctx, tables, query };
}
beforeEach(() => vi.stubEnv("CLERK_BOOTSTRAP_ADMIN_EMAILS", ""));
afterEach(() => vi.unstubAllEnvs());

describe("legacy staff selectors do not expose public staff data", () => {
  it.each([null, "unlinked@example.invalid", "referee@example.invalid"])("blocks staff lists for %s before reading them", async (email) => {
    const h = fixture(email);
    await expect(readActiveReferees(h.ctx)).rejects.toThrow();
    await expect(readMatchesByTeam(h.ctx, teamId)).rejects.toThrow();
    expect(h.query.mock.calls.filter(([name]) => name === "matches")).toHaveLength(0);
  });
  it("blocks a linked coach from another team's matches", async () => {
    const h = fixture("coach@example.invalid");
    await expect(readMatchesByTeam(h.ctx, "team-b" as Id<"teams">)).rejects.toThrow("Geen toegang tot dit team");
    expect(h.query.mock.calls.filter(([name]) => name === "matches")).toHaveLength(0);
  });
  it.each(["coach@example.invalid", "admin@example.invalid"])("returns only safe selector fields to %s", async (email) => {
    const h = fixture(email);
    expect(await readActiveReferees(h.ctx)).toEqual([{ id: "referee", name: "Test Referee", qualificationTags: ["JO13"] }]);
    const matches = await readMatchesByTeam(h.ctx, teamId);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ _id: "match", teamId, opponent: "Test Opponent", publicCode: "PUBLIC" });
    expect(matches[0]).not.toHaveProperty("coachPin");
    expect(matches[0]).not.toHaveProperty("coachId");
    expect(matches[0]).not.toHaveProperty("leadCoachId");
    expect(matches[0]).not.toHaveProperty("refereeId");
  });
  it("rejects a disabled access record even if its coach row still exists", async () => {
    const h = fixture("coach@example.invalid");
    h.tables.userAccess.push({ _id: "disabled", email: "coach@example.invalid", roles: ["coach"], coachId: "coach", active: false });
    await expect(readActiveReferees(h.ctx)).rejects.toThrow();
    await expect(readMatchesByTeam(h.ctx, teamId)).rejects.toThrow();
  });
  it("bounds team history and rejects an over-capacity referee selector", async () => {
    const h = fixture("admin@example.invalid");
    h.tables.matches = Array.from({ length: 300 }, (_, index) => ({ ...h.tables.matches[0], _id: `match-${index}` }));
    expect(await readMatchesByTeam(h.ctx, teamId)).toHaveLength(250);
    h.tables.referees = Array.from({ length: 501 }, (_, index) => ({ ...h.tables.referees[0], _id: `referee-${index}` }));
    await expect(readActiveReferees(h.ctx)).rejects.toThrow("Te veel scheidsrechters");
  });
});
