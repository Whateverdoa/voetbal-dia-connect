// @vitest-environment node
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import { describe, expect, it } from "vitest";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";
const modules = { "./refereeRegistration.ts": () => import("./refereeRegistration"), "./_generated/server.ts": () => import("./_generated/server") };
const diagnose = makeFunctionReference<"query", { matchId: Id<"matches"> }>("refereeRegistration:diagnose");
const identity = { subject: "synthetic-ref", email: "ref@example.test", emailVerified: true };
async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async ctx => {
    const clubId = await ctx.db.insert("clubs", { name: "Synthetic", slug: "synthetic", createdAt: 1 });
    const teamId = await ctx.db.insert("teams", { clubId, name: "Test", slug: "test", createdAt: 1 });
    const otherTeamId = await ctx.db.insert("teams", { clubId, name: "Other", slug: "other", createdAt: 1 });
    const refereeId = await ctx.db.insert("referees", { name: "Ref", email: identity.email, active: true, createdAt: 1 });
    const coachId = await ctx.db.insert("coaches", { name: "Coach", email: "coach@example.test", teamIds: [teamId], createdAt: 1 });
    const accessId = await ctx.db.insert("userAccess", { email: identity.email, roles: ["referee"], refereeId, active: true, source: "admin_manual", lastSyncedAt: 1, createdAt: 1, updatedAt: 1 });
    const matchId = await ctx.db.insert("matches", { teamId, publicCode: "LOCAL1", opponent: "Other", isHome: true, status: "scheduled", currentQuarter: 1, quarterCount: 4, homeScore: 0, awayScore: 0, showLineup: true, refereeId, createdAt: 1 });
    return { teamId, otherTeamId, refereeId, coachId, accessId, matchId };
  });
  const actor = t.withIdentity(identity);
  return { t, actor, ids, read: () => actor.query(diagnose, { matchId: ids.matchId }) };
}
describe("read-only registrar diagnosis without activation", () => {
  it("confirms assigned referee before policy/scope activation and changes nothing", async () => {
    const { t, ids, read } = await fixture();
    const snapshot = () => t.run(async ctx => ({ match: await ctx.db.get(ids.matchId), scopes: await ctx.db.query("mobilePilotScopes").take(10), events: await ctx.db.query("matchEvents").take(10) }));
    const before = await snapshot();
    expect(await read()).toMatchObject({ diagnosticVersion: 1, readOnly: true, actorSubject: identity.subject, matchId: ids.matchId, controller: "referee", isOfficialRegistrar: true, eligibleToControl: true, policyActive: false, mobileScopeStatus: "missing" });
    expect(await snapshot()).toEqual(before);
  });
  it("rejects anonymous, incomplete claims and revoked access", async () => {
    const { t, ids, read } = await fixture();
    await expect(t.query(diagnose, { matchId: ids.matchId })).rejects.toThrow("UNAUTHENTICATED");
    await expect(t.withIdentity({ ...identity, emailVerified: false }).query(diagnose, { matchId: ids.matchId })).rejects.toThrow("AUTH_IDENTITY_INCOMPLETE");
    await t.run(ctx => ctx.db.patch(ids.accessId, { active: false }));
    await expect(read()).rejects.toThrow("FORBIDDEN");
  });
  it("admin read does not confer registrar rights", async () => {
    const { t, ids, read } = await fixture();
    await t.run(ctx => ctx.db.patch(ids.accessId, { roles: ["admin"], refereeId: undefined }));
    // Derived referee rights must also be removed for this synthetic admin.
    await t.run(ctx => ctx.db.patch(ids.refereeId, { email: "different@example.test" }));
    expect(await read()).toMatchObject({ controller: "referee", isOfficialRegistrar: false, eligibleToControl: false });
  });
  it("only an explicitly assigned own-team coach is fallback without a referee", async () => {
    const { t, ids } = await fixture();
    const coach = t.withIdentity({ subject: "coach", email: "coach@example.test", emailVerified: true });
    expect(await coach.query(diagnose, { matchId: ids.matchId })).toMatchObject({ isOfficialRegistrar: false });
    await t.run(ctx => ctx.db.patch(ids.matchId, { refereeId: undefined }));
    expect(await coach.query(diagnose, { matchId: ids.matchId })).toMatchObject({ controller: "none", isOfficialRegistrar: false });
    await t.run(ctx => ctx.db.patch(ids.matchId, { leadCoachId: ids.coachId }));
    expect(await coach.query(diagnose, { matchId: ids.matchId })).toMatchObject({ controller: "coach", isOfficialRegistrar: true, eligibleToControl: true });
  });
  it("an inactive assigned referee does not silently enable coach fallback", async () => {
    const { t, ids } = await fixture();
    await t.run(async ctx => { await ctx.db.patch(ids.refereeId, { active: false }); await ctx.db.patch(ids.matchId, { leadCoachId: ids.coachId }); });
    expect(await t.withIdentity({ subject: "coach", email: "coach@example.test", emailVerified: true }).query(diagnose, { matchId: ids.matchId })).toMatchObject({ controller: "referee", isOfficialRegistrar: false });
  });
  it("denies unrelated teams and inactive teams", async () => {
    const { t, ids, read } = await fixture();
    const outsider = t.withIdentity({ subject: "outsider", email: "outside@example.test", emailVerified: true });
    await expect(outsider.query(diagnose, { matchId: ids.matchId })).rejects.toThrow("FORBIDDEN");
    await t.run(ctx => ctx.db.patch(ids.teamId, { active: false }));
    await expect(read()).rejects.toThrow("FORBIDDEN");
  });
  it("finished/cancelled matches remain ineligible", async () => {
    const { t, ids, read } = await fixture();
    await t.run(ctx => ctx.db.patch(ids.matchId, { status: "finished" }));
    expect(await read()).toMatchObject({ isOfficialRegistrar: true, eligibleToControl: false });
    await t.run(ctx => ctx.db.patch(ids.matchId, { status: "scheduled", cancelledAt: 1 }));
    expect(await read()).toMatchObject({ eligibleToControl: false });
  });
  it("reports scope state without granting, extending or repairing it", async () => {
    const { t, ids, read } = await fixture();
    const scopeId = await t.run(ctx => ctx.db.insert("mobilePilotScopes", { subject: identity.subject, matchId: ids.matchId, teamId: ids.teamId, enabled: false, expiresAt: Date.now() + 60_000, updatedAt: 1 }));
    expect(await read()).toMatchObject({ mobileScopeStatus: "disabled" });
    await t.run(ctx => ctx.db.patch(scopeId, { enabled: true, expiresAt: 1 }));
    expect(await read()).toMatchObject({ mobileScopeStatus: "expired" });
    await t.run(ctx => ctx.db.patch(scopeId, { expiresAt: Date.now() + 60_000, teamId: ids.otherTeamId }));
    expect(await read()).toMatchObject({ mobileScopeStatus: "team_mismatch" });
    await t.run(ctx => ctx.db.patch(scopeId, { teamId: ids.teamId }));
    expect(await read()).toMatchObject({ mobileScopeStatus: "ready", policyActive: false });
    expect((await t.run(ctx => ctx.db.get(scopeId)))?.writesEnabled).toBeUndefined();
  });
});
