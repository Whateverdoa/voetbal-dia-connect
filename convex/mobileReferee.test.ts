// @vitest-environment node
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";

const modules = {
  "./mobileReferee.ts": () => import("./mobileReferee"),
  "./mobilePilotScopes.ts": () => import("./mobilePilotScopes"),
  "./_generated/server.ts": () => import("./_generated/server"),
};
const session = makeFunctionReference<"query", Record<string, never>>("mobileReferee:session");
const getMatch = makeFunctionReference<"query", { matchId: Id<"matches"> }>("mobileReferee:getMatch");
const timeline = makeFunctionReference<"query", { matchId: Id<"matches">; paginationOpts: { numItems: number; cursor: string | null } }>("mobileReferee:timeline");
const configure = makeFunctionReference<"mutation", { subject: string; matchId: Id<"matches">; teamId: Id<"teams">; enabled: boolean; expiresAt: number }, Id<"mobilePilotScopes">>("mobilePilotScopes:configure");
const expire = makeFunctionReference<"mutation", { scopeId: Id<"mobilePilotScopes">; expiresAt: number }, null>("mobilePilotScopes:expire");
const identity = { subject: "pilot-ref", email: "ref@example.test", emailVerified: true };

async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async ctx => {
    const clubId = await ctx.db.insert("clubs", { name: "DIA test", slug: "dia-test", createdAt: 1 });
    const teamId = await ctx.db.insert("teams", { clubId, name: "Testteam", slug: "test", createdAt: 1 });
    const otherTeamId = await ctx.db.insert("teams", { clubId, name: "Other", slug: "other", createdAt: 1 });
    const refereeId = await ctx.db.insert("referees", { name: "Ref", email: identity.email, active: true, createdAt: 1 });
    const coachId = await ctx.db.insert("coaches", { name: "Coach", email: "coach@example.test", teamIds: [teamId], createdAt: 1 });
    const match = { teamId, publicCode: "PILOT1", opponent: "Opponent", isHome: true, status: "scheduled" as const,
      currentQuarter: 1, quarterCount: 4, regulationDurationMinutes: 60, homeScore: 0, awayScore: 0, showLineup: true, refereeId, createdAt: 1 };
    const matchId = await ctx.db.insert("matches", match);
    const otherMatchId = await ctx.db.insert("matches", { ...match, publicCode: "PILOT2" });
    const accessId = await ctx.db.insert("userAccess", { email: identity.email, roles: ["referee"], refereeId,
      active: true, source: "admin_manual", lastSyncedAt: 1, createdAt: 1, updatedAt: 1 });
    return { teamId, otherTeamId, refereeId, coachId, matchId, otherMatchId, accessId };
  });
  const actor = t.withIdentity(identity);
  const grant = (overrides: Partial<Parameters<typeof t.mutation<typeof configure>>[1]> = {}) => t.mutation(configure, {
    subject: identity.subject, matchId: ids.matchId, teamId: ids.teamId, enabled: true, expiresAt: Date.now() + 60_000, ...overrides,
  });
  return { t, actor, ids, grant };
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-15T19:00:00Z")); });
afterEach(() => vi.useRealTimers());

describe("mobile pilot read-only access", () => {
  it("denies access by default and anonymous requests", async () => {
    const { t, actor } = await fixture();
    await expect(actor.query(session, {})).rejects.toThrow("PILOT_ACCESS_DENIED");
    await expect(t.query(session, {})).rejects.toThrow("UNAUTHENTICATED");
  });

  it("rejects unverified identities even with an approved subject", async () => {
    const { t, grant } = await fixture();
    await grant();
    await expect(t.withIdentity({ ...identity, emailVerified: false }).query(session, {})).rejects.toThrow("AUTH_IDENTITY_INCOMPLETE");
  });

  it("exposes compatibility and eligibility but never write permission", async () => {
    const { actor, ids, grant } = await fixture();
    await grant();
    expect(await actor.query(session, {})).toMatchObject({ subject: identity.subject, apiVersion: 1, clockPolicyVersion: 0, writesEnabled: false });
    expect(await actor.query(getMatch, { matchId: ids.matchId })).toMatchObject({ controller: "referee", eligibleToControl: true, canControl: false, periodMinutes: 15 });
  });

  it("does not extend approval to another match or subject", async () => {
    const { t, actor, ids, grant } = await fixture();
    await grant();
    await expect(actor.query(getMatch, { matchId: ids.otherMatchId })).rejects.toThrow("PILOT_ACCESS_DENIED");
    await expect(t.withIdentity({ ...identity, subject: "other-subject" }).query(session, {})).rejects.toThrow("PILOT_ACCESS_DENIED");
  });

  it("denies disabled and expired scopes without waiting for the scheduler", async () => {
    const { actor, grant } = await fixture();
    await grant({ enabled: false });
    await expect(actor.query(session, {})).rejects.toThrow("PILOT_ACCESS_DENIED");
    await grant();
    vi.setSystemTime(Date.now() + 60_001);
    await expect(actor.query(session, {})).rejects.toThrow("PILOT_ACCESS_DENIED");
  });

  it("rejects wrong-team grants and invalid expiry dates", async () => {
    const { ids, grant } = await fixture();
    await expect(grant({ teamId: ids.otherTeamId })).rejects.toThrow("PILOT_ACCESS_DENIED");
    await expect(grant({ expiresAt: Date.now() })).rejects.toThrow("VALIDATION_ERROR");
    await expect(grant({ expiresAt: Date.now() + 8 * 86400_000 })).rejects.toThrow("VALIDATION_ERROR");
  });

  it("revokes reads when existing account access is disabled", async () => {
    const { t, actor, ids, grant } = await fixture();
    await grant();
    await t.run(ctx => ctx.db.patch(ids.accessId, { active: false }));
    await expect(actor.query(session, {})).rejects.toThrow("FORBIDDEN");
  });

  it("does not let admin status imply registration authority", async () => {
    const { t, actor, ids, grant } = await fixture();
    await grant();
    await t.run(async ctx => {
      await ctx.db.patch(ids.accessId, { roles: ["admin"], refereeId: undefined });
      await ctx.db.patch(ids.refereeId, { email: "different@example.test" });
    });
    expect(await actor.query(getMatch, { matchId: ids.matchId })).toMatchObject({ eligibleToControl: false, canControl: false });
  });

  it("allows coach fallback only while the official referee task is empty", async () => {
    const { t, actor, ids, grant } = await fixture();
    await grant();
    await t.run(async ctx => {
      await ctx.db.patch(ids.accessId, { roles: ["coach"], refereeId: undefined, coachId: ids.coachId });
      await ctx.db.patch(ids.refereeId, { email: "different@example.test", active: false });
      await ctx.db.patch(ids.matchId, { leadCoachId: ids.coachId });
    });
    expect(await actor.query(getMatch, { matchId: ids.matchId })).toMatchObject({ controller: "referee", eligibleToControl: false });
    await t.run(ctx => ctx.db.patch(ids.matchId, { refereeId: undefined }));
    expect(await actor.query(getMatch, { matchId: ids.matchId })).toMatchObject({ controller: "coach", eligibleToControl: true });
    await t.run(ctx => ctx.db.patch(ids.matchId, { leadCoachId: undefined }));
    expect(await actor.query(getMatch, { matchId: ids.matchId })).toMatchObject({ controller: "none", eligibleToControl: false });
  });

  it("ignores stale expiry checks after extension and disables on the current boundary", async () => {
    const { t, actor, grant } = await fixture();
    const firstExpiry = Date.now() + 60_000;
    const scopeId = await grant({ expiresAt: firstExpiry });
    const secondExpiry = firstExpiry + 60_000;
    await grant({ expiresAt: secondExpiry });
    vi.setSystemTime(firstExpiry);
    await t.mutation(expire, { scopeId, expiresAt: firstExpiry });
    expect(await actor.query(session, {})).toMatchObject({ expiresAt: secondExpiry });
    vi.setSystemTime(secondExpiry);
    await t.mutation(expire, { scopeId, expiresAt: secondExpiry });
    expect(await t.run(ctx => ctx.db.get(scopeId))).toMatchObject({ enabled: false });
  });

  it("filters unavailable, inactive and foreign-team roster entries", async () => {
    const { t, actor, ids, grant } = await fixture();
    await grant();
    await t.run(async ctx => {
      for (const [name, active, absent, injured, teamId] of [
        ["Available", true, false, false, ids.teamId], ["Absent", true, true, false, ids.teamId],
        ["Injured", true, false, true, ids.teamId], ["Inactive", false, false, false, ids.teamId],
        ["Foreign", true, false, false, ids.otherTeamId],
      ] as const) {
        const playerId = await ctx.db.insert("players", { name, active, teamId, createdAt: 1 });
        await ctx.db.insert("matchPlayers", { matchId: ids.matchId, playerId, absent, injured, isKeeper: false, onField: false, createdAt: 1 });
      }
    });
    const result = await actor.query(getMatch, { matchId: ids.matchId });
    expect(result.players.map((p: { name: string }) => p.name)).toEqual(["Available"]);
  });

  it("retains all quarters, hides coach planning and folds partial goal enrichments", async () => {
    const { t, actor, ids, grant } = await fixture();
    await grant();
    await t.run(async ctx => {
      const scorer = await ctx.db.insert("players", { teamId: ids.teamId, name: "Corrected scorer", active: true, createdAt: 1 });
      const assist = await ctx.db.insert("players", { teamId: ids.teamId, name: "Assist", active: true, createdAt: 1 });
      const base = { matchId: ids.matchId, quarter: 1, timestamp: 1, createdAt: 1 };
      const goal = await ctx.db.insert("matchEvents", { ...base, type: "goal" });
      await ctx.db.insert("matchEvents", { ...base, type: "goal_enrichment", targetEventId: goal, playerId: scorer, createdAt: 2 });
      await ctx.db.insert("matchEvents", { ...base, type: "goal_enrichment", targetEventId: goal, relatedPlayerId: assist, createdAt: 3 });
      await ctx.db.insert("matchEvents", { ...base, type: "substitution_staged" });
      await ctx.db.insert("matchEvents", { ...base, type: "substitution_cancelled" });
      for (const quarter of [2, 3, 4]) await ctx.db.insert("matchEvents", { ...base, quarter, type: "goal" });
    });
    const result = await actor.query(timeline, { matchId: ids.matchId, paginationOpts: { cursor: null, numItems: 100 } });
    expect(result.page.map((e: { quarter: number }) => e.quarter).sort()).toEqual([1, 2, 3, 4]);
    expect(result.page.find((e: { quarter: number }) => e.quarter === 1)).toMatchObject({ playerName: "Corrected scorer" });
    expect(result.isDone).toBe(true);
  });
});
