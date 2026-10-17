// @vitest-environment node
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import { expect, it } from "vitest";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";
const modules = { "./refereeDuty.ts": () => import("./refereeDuty"), "./_generated/server.ts": () => import("./_generated/server") };
const appoint = makeFunctionReference<"mutation", { matchId: Id<"matches">; coachId: Id<"coaches">; expectedVersion: number; correlationId: string }>("refereeDuty:appointCoach");
async function fixture() {
 const t = convexTest(schema, modules);
 const ids = await t.run(async ctx => {
  const clubId = await ctx.db.insert("clubs", { name: "Local", slug: "local", createdAt: 1 });
  const teamId = await ctx.db.insert("teams", { clubId, name: "Local", slug: "local", createdAt: 1 });
  const coachId = await ctx.db.insert("coaches", { name: "Coach", email: "coach@example.test", teamIds: [teamId], createdAt: 1 });
  const otherCoachId = await ctx.db.insert("coaches", { name: "Other", email: "other@example.test", teamIds: [teamId], createdAt: 1 });
  const matchId = await ctx.db.insert("matches", { teamId, publicCode: "LOCAL", opponent: "Local", isHome: true, status: "scheduled", currentQuarter: 1,
   quarterCount: 2, homeScore: 0, awayScore: 0, showLineup: false, createdAt: 1,
   refereePolicy: { version: 1, generation: 0, commandVersion: 0, elapsedMs: 0, runningSince: null, periodStartedElapsedMs: 0, safetyMarginMinutes: 10, confirmedStoppageMs: 0 } });
  const adminId = await ctx.db.insert("userAccess", { email: "admin@example.test", roles: ["admin"], active: true,
   source: "admin_manual", lastSyncedAt: 1, createdAt: 1, updatedAt: 1 });
  return { coachId, otherCoachId, matchId, adminId };
 });
 const actor = (email: string) => t.withIdentity({ subject: email, email, emailVerified: true });
 const args = { matchId: ids.matchId, coachId: ids.coachId, expectedVersion: 0, correlationId: "appointment-1" };
 return { t, ...ids, actor, args };
}
it("admin appointment gives one exact receipt on retry, not admin registration rights", async () => {
 const f = await fixture(); const admin = f.actor("admin@example.test");
 const receipt = await admin.mutation(appoint, f.args);
 expect(await admin.mutation(appoint, f.args)).toEqual(receipt);
 const match = await f.t.run(ctx => ctx.db.get(f.matchId));
 expect(match).toMatchObject({ leadCoachId: f.coachId, homeScore: 0, refereePolicy: { commandVersion: 1 } });
 const events = await f.t.run(ctx => ctx.db.query("matchEvents").withIndex("by_match", q => q.eq("matchId", f.matchId)).take(10));
 expect(events).toHaveLength(1);
 expect(events[0]).toMatchObject({ actorSubject: "admin@example.test", type: "official_audit" });
});
it("same key with changed content is rejected", async () => {
 const f = await fixture(); const admin = f.actor("admin@example.test");
 await admin.mutation(appoint, f.args);
 await expect(admin.mutation(appoint, { ...f.args, coachId: f.otherCoachId })).rejects.toThrow("CORRELATION_CONTENT_MISMATCH");
});
it("two simultaneous self-claims produce only one registrator", async () => {
 const f = await fixture();
 const results = await Promise.allSettled([
  f.actor("coach@example.test").mutation(appoint, f.args),
  f.actor("other@example.test").mutation(appoint, { ...f.args, coachId: f.otherCoachId, correlationId: "other-claim" }),
 ]);
 expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
 const events = await f.t.run(ctx => ctx.db.query("matchEvents").withIndex("by_match", q => q.eq("matchId", f.matchId)).take(10));
 expect(events).toHaveLength(1);
});
it("a coach cannot appoint another coach or take an occupied task", async () => {
 const f = await fixture(); const coach = f.actor("coach@example.test");
 await expect(coach.mutation(appoint, { ...f.args, coachId: f.otherCoachId })).rejects.toThrow("FORBIDDEN");
 await f.t.run(ctx => ctx.db.patch(f.matchId, { leadCoachId: f.otherCoachId }));
 await expect(coach.mutation(appoint, f.args)).rejects.toThrow("OFFICIAL_DUTY_OCCUPIED");
});
it("even an inactive assigned referee blocks fallback", async () => {
 const f = await fixture();
 await f.t.run(async ctx => { const refereeId = await ctx.db.insert("referees", { name: "Inactive", active: false, createdAt: 1 });
  await ctx.db.patch(f.matchId, { refereeId }); });
 await expect(f.actor("admin@example.test").mutation(appoint, f.args)).rejects.toThrow("OFFICIAL_DUTY_UNAVAILABLE");
});
it("revoked admin access also rejects retries of an existing receipt", async () => {
 const f = await fixture(); const admin = f.actor("admin@example.test");
 await admin.mutation(appoint, f.args);
 await f.t.run(ctx => ctx.db.patch(f.adminId, { active: false }));
 await expect(admin.mutation(appoint, f.args)).rejects.toThrow("FORBIDDEN");
});
