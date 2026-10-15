// @vitest-environment node
import { convexTest } from "convex-test";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import schema from "./schema";
import { executeRefereeRegistration as execute } from "./lib/refereeRegistration";
import { projectRefereeClock } from "./lib/refereeMatchPolicy";
import { applyGoalEnrichments } from "./lib/matchEventProjection";
import type { RefereeAction } from "./lib/refereeRegistrationContract";
const modules = { "./refereePolicy.ts": () => import("./refereePolicy"), "./_generated/server.ts": () => import("./_generated/server") };
const minute = 60_000;
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(1_700_000_000_000); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });
async function fixture() {
 const t = convexTest(schema, modules);
 const ids = await t.run(async ctx => {
  const clubId = await ctx.db.insert("clubs", { name: "Local", slug: "local", createdAt: 1 });
  const teamId = await ctx.db.insert("teams", { clubId, name: "Local", slug: "local", createdAt: 1 });
  const otherTeamId = await ctx.db.insert("teams", { clubId, name: "Other", slug: "other", createdAt: 1 });
  const refereeId = await ctx.db.insert("referees", { name: "Local referee", email: "ref@example.test", active: true, createdAt: 1 });
  const coachId = await ctx.db.insert("coaches", { name: "Local coach", email: "coach@example.test", teamIds: [teamId], createdAt: 1 });
  const refAccessId = await ctx.db.insert("userAccess", { email: "ref@example.test", roles: ["referee"], refereeId, active: true,
   source: "admin_manual", lastSyncedAt: 1, createdAt: 1, updatedAt: 1 });
  await ctx.db.insert("userAccess", { email: "admin@example.test", roles: ["admin"], active: true,
   source: "admin_manual", lastSyncedAt: 1, createdAt: 1, updatedAt: 1 });
  const template = { teamId, refereeId, leadCoachId: coachId, publicCode: "LOCAL", opponent: "Local only", isHome: true, status: "scheduled" as const,
   currentQuarter: 1, quarterCount: 2, regulationDurationMinutes: 60, homeScore: 0, awayScore: 0, showLineup: false, createdAt: 1,
   refereePolicy: { version: 1 as const, generation: 0, commandVersion: 0, elapsedMs: 0, runningSince: null, periodStartedElapsedMs: 0, safetyMarginMinutes: 10, confirmedStoppageMs: 0 } };
  const matchId = await ctx.db.insert("matches", template);
  const otherMatchId = await ctx.db.insert("matches", { ...template, publicCode: "OTHER" });
  const playerId = await ctx.db.insert("players", { name: "Scorer", teamId, active: true, createdAt: 1 });
  const assistId = await ctx.db.insert("players", { name: "Assist", teamId, active: true, createdAt: 1 });
  const foreignId = await ctx.db.insert("players", { name: "Foreign", teamId: otherTeamId, active: true, createdAt: 1 });
  const selectionId = await ctx.db.insert("matchPlayers", { matchId, playerId, isKeeper: false, onField: true, createdAt: 1 });
  await ctx.db.insert("matchPlayers", { matchId, playerId: assistId, isKeeper: false, onField: true, createdAt: 1 });
  return { matchId, otherMatchId, refereeId, coachId, refAccessId, playerId, assistId, foreignId, selectionId };
 });
 const identity = (email: string) => t.withIdentity({ subject: email, email, emailVerified: true });
 const ref = identity("ref@example.test");
 const row = () => t.run(ctx => ctx.db.get(ids.matchId));
 const events = () => t.run(ctx => ctx.db.query("matchEvents").withIndex("by_match", q => q.eq("matchId", ids.matchId)).take(100));
 let serial = 0;
 const command = async (action: RefereeAction) => {
  const match = (await row())!;
  return { matchId: ids.matchId, action, expectedVersion: match.refereePolicy!.commandVersion + (projectRefereeClock(match, Date.now())!.changed ? 1 : 0), correlationId: `local-${++serial}` };
 };
 const act = async (action: RefereeAction) => { const args = await command(action); return ref.run(ctx => execute(ctx, args)); };
 return { t, ref, identity, row, events, command, act, ...ids };
}
it("only the assigned active referee registers; admin and assigned coach cannot bypass", async () => {
 const f = await fixture(); const args = await f.command({ kind: "start" });
 for (const email of ["admin@example.test", "coach@example.test"]) await expect(f.identity(email).run(ctx => execute(ctx, args))).rejects.toThrow("OFFICIAL_REGISTRATOR_REQUIRED");
 await f.ref.run(ctx => execute(ctx, args));
 await f.t.run(ctx => ctx.db.patch(f.refereeId, { active: false }));
 await expect(f.act({ kind: "goal", team: "home" })).rejects.toThrow("OFFICIAL_REGISTRATOR_REQUIRED");
});
it("coach fallback works only after the referee task is explicitly empty", async () => {
 const f = await fixture();
 await f.t.run(ctx => ctx.db.patch(f.matchId, { refereeId: undefined }));
 const args = await f.command({ kind: "start" });
 await expect(f.identity("coach@example.test").run(ctx => execute(ctx, args))).resolves.toMatchObject({ version: 1 });
});
it("retries return the same receipt; changed payload or version under that key is rejected", async () => {
 const f = await fixture(); await f.act({ kind: "start" });
 const args = await f.command({ kind: "goal", team: "home" });
 const receipt = await f.ref.run(ctx => execute(ctx, args));
 expect(await f.ref.run(ctx => execute(ctx, args))).toEqual(receipt);
 await expect(f.ref.run(ctx => execute(ctx, { ...args, action: { kind: "goal", team: "away" } }))).rejects.toThrow("CORRELATION_CONTENT_MISMATCH");
 await expect(f.ref.run(ctx => execute(ctx, { ...args, expectedVersion: receipt.version }))).rejects.toThrow("CORRELATION_CONTENT_MISMATCH");
 expect((await f.events()).filter(e => e.type === "goal")).toHaveLength(1);
 expect((await f.row())!.homeScore).toBe(1);
});
it("rejects stale versions without changing score", async () => {
 const f = await fixture(); await f.act({ kind: "start" });
 const stale = await f.command({ kind: "goal", team: "home" });
 await f.act({ kind: "goal", team: "away" });
 await expect(f.ref.run(ctx => execute(ctx, stale))).rejects.toThrow("VERSION_CONFLICT");
 expect(await f.row()).toMatchObject({ homeScore: 0, awayScore: 1 });
});
it("start never resets a running match", async () => {
 const f = await fixture(); await f.act({ kind: "start" }); const kickoff = Date.now();
 vi.setSystemTime(kickoff + minute);
 await expect(f.act({ kind: "start" })).rejects.toThrow("MATCH_ALREADY_STARTED");
 expect((await f.row())!.startedAt).toBe(kickoff);
});
it("paused clock stops and resumes without double-counting interruption time", async () => {
 const f = await fixture(); await f.act({ kind: "start" }); const kickoff = Date.now();
 vi.setSystemTime(kickoff + 12 * minute); await f.act({ kind: "pause" });
 vi.setSystemTime(kickoff + 18 * minute); await f.act({ kind: "resume" });
 expect((await f.row())!.refereePolicy).toMatchObject({ elapsedMs: 12 * minute, confirmedStoppageMs: 6 * minute, clockLimitAt: kickoff + 46 * minute });
});
it("late finish audits the exact cutoff separately from the user command", async () => {
 const f = await fixture(); await f.act({ kind: "start" }); const kickoff = Date.now();
 vi.setSystemTime(kickoff + 600 * minute); await f.act({ kind: "finish" });
 const events = await f.events(); const automatic = events.filter(e => e.type === "clock_guard");
 expect(automatic).toHaveLength(1);
 expect(automatic[0]).toMatchObject({ actorKind: "system", effectiveAt: kickoff + 40 * minute, matchMs: 40 * minute });
 expect(automatic[0]).not.toHaveProperty("actorSubject");
 expect((await f.row())!.refereePolicy).toMatchObject({ elapsedMs: 40 * minute, confirmedStoppageMs: 0 });
});
it("undo appends a correction for the exact goal and preserves the original, cards and incidents", async () => {
 const f = await fixture(); await f.act({ kind: "start" });
 const goal = await f.act({ kind: "goal", team: "home" });
 await f.act({ kind: "yellow_card", team: "away" }); await f.act({ kind: "incident" });
 await f.act({ kind: "correct_goal", eventId: goal.commandEventId });
 expect((await f.row())!.homeScore).toBe(0);
 expect((await f.events()).map(e => e.type)).toEqual(["official_audit", "goal", "yellow_card", "incident", "goal_correction"]);
 await expect(f.act({ kind: "correct_goal", eventId: goal.commandEventId })).rejects.toThrow("GOAL_ALREADY_CORRECTED");
});
it("validates team side, availability and selection, retaining explicit own goals", async () => {
 const f = await fixture(); await f.act({ kind: "start" });
 await expect(f.act({ kind: "goal", team: "away", scorerId: f.playerId })).rejects.toThrow("PLAYER_TEAM_SIDE_MISMATCH");
 await expect(f.act({ kind: "goal", team: "home", scorerId: f.foreignId })).rejects.toThrow("PLAYER_NOT_AVAILABLE_FOR_MATCH");
 await f.t.run(ctx => ctx.db.patch(f.selectionId, { absent: true }));
 await expect(f.act({ kind: "goal", team: "home", scorerId: f.playerId })).rejects.toThrow("PLAYER_NOT_AVAILABLE_FOR_MATCH");
 await f.t.run(ctx => ctx.db.patch(f.selectionId, { absent: false, injured: true }));
 await expect(f.act({ kind: "goal", team: "home", scorerId: f.playerId })).rejects.toThrow("PLAYER_NOT_AVAILABLE_FOR_MATCH");
 await f.t.run(ctx => ctx.db.patch(f.selectionId, { injured: false }));
 await f.act({ kind: "goal", team: "away", scorerId: f.playerId, isOwnGoal: true });
 expect(await f.row()).toMatchObject({ homeScore: 0, awayScore: 1 });
});
it("partial enrichment after finishing preserves scorer and never changes score or clock", async () => {
 const f = await fixture(); await f.act({ kind: "start" }); const goal = await f.act({ kind: "goal", team: "home" });
 await f.act({ kind: "finish" }); const before = (await f.row())!;
 await f.act({ kind: "enrich_goal", eventId: goal.commandEventId, scorerId: f.playerId });
 await f.act({ kind: "enrich_goal", eventId: goal.commandEventId, assistId: f.assistId });
 const after = (await f.row())!;
 expect(after.homeScore).toBe(before.homeScore);
 expect(after.refereePolicy!.elapsedMs).toBe(before.refereePolicy!.elapsedMs);
 const enriched = applyGoalEnrichments(await f.events()).find(e => e._id === goal.commandEventId);
 expect(enriched).toMatchObject({ playerId: f.playerId, relatedPlayerId: f.assistId });
});
it("foreign match target and own roster on an opponent card are rejected", async () => {
 const f = await fixture(); await f.act({ kind: "start" });
 const otherGoal = await f.t.run(ctx => ctx.db.insert("matchEvents", { matchId: f.otherMatchId, type: "goal", quarter: 1, timestamp: Date.now(), createdAt: Date.now() }));
 await expect(f.act({ kind: "correct_goal", eventId: otherGoal })).rejects.toThrow("GOAL_NOT_FOUND");
 await expect(f.act({ kind: "yellow_card", team: "away", playerId: f.playerId })).rejects.toThrow("PLAYER_TEAM_SIDE_MISMATCH");
});
it("card details can be skipped and appended later without modifying the original", async () => {
 const f = await fixture(); await f.act({ kind: "start" }); const card = await f.act({ kind: "red_card", team: "away" });
 await f.act({ kind: "finish" });
 await f.act({ kind: "annotate_event", eventId: card.commandEventId, reportedNumber: 7, note: "Later toegevoegd" });
 const original = await f.t.run(ctx => ctx.db.get(card.commandEventId));
 expect(original).not.toHaveProperty("reportedNumber");
 expect((await f.events()).find(e => e.type === "official_annotation")).toMatchObject({ targetEventId: card.commandEventId, reportedNumber: 7 });
});
it("access revocation and reassignment deny even a previously confirmed retry", async () => {
 const f = await fixture(); const args = await f.command({ kind: "start" }); await f.ref.run(ctx => execute(ctx, args));
 await f.t.run(ctx => ctx.db.patch(f.refAccessId, { active: false }));
 await expect(f.ref.run(ctx => execute(ctx, args))).rejects.toThrow("FORBIDDEN");
 await f.t.run(async ctx => { await ctx.db.patch(f.refAccessId, { active: true }); await ctx.db.patch(f.matchId, { refereeId: undefined }); });
 await expect(f.ref.run(ctx => execute(ctx, args))).rejects.toThrow("OFFICIAL_REGISTRATOR_REQUIRED");
});
it("long interruption decisions retain original timestamps in append-only audit", async () => {
 const f = await fixture(); await f.act({ kind: "start" });
 const pausedAt = Date.now() + minute; vi.setSystemTime(pausedAt); await f.act({ kind: "pause" });
 vi.setSystemTime(pausedAt + 600 * minute);
 await expect(f.act({ kind: "resume" })).rejects.toThrow("STOPPAGE_REVIEW_REQUIRED");
 await f.act({ kind: "resume", stoppageDisposition: "discard" });
 const resume = (await f.events()).find(e => e.commandType === "OFFICIAL_RESUME");
 expect(resume).toMatchObject({ stoppageStartedAt: pausedAt, observedStoppageMs: 600 * minute, stoppageDisposition: "discard" });
 expect((await f.row())!.refereePolicy).toMatchObject({ elapsedMs: minute, confirmedStoppageMs: 0 });
});
it("a cancelled marker at epoch zero still blocks registration", async () => {
 const f = await fixture(); await f.t.run(ctx => ctx.db.patch(f.matchId, { cancelledAt: 0 }));
 await expect(f.act({ kind: "start" })).rejects.toThrow("OFFICIAL_REGISTRATOR_REQUIRED");
});
it.each([true, false])("opponent own goal works home=%s without borrowing DIA players or assists", async isHome => {
 const f = await fixture(); await f.t.run(ctx => ctx.db.patch(f.matchId, { isHome })); await f.act({ kind: "start" });
 const team = isHome ? "home" as const : "away" as const;
 await expect(f.act({ kind: "goal", team, isOwnGoal: true, scorerId: f.playerId })).rejects.toThrow("PLAYER_TEAM_SIDE_MISMATCH");
 await expect(f.act({ kind: "goal", team, isOwnGoal: true, assistId: f.assistId })).rejects.toThrow("PLAYER_TEAM_SIDE_MISMATCH");
 const goal = await f.act({ kind: "goal", team, isOwnGoal: true });
 expect(await f.row()).toMatchObject(isHome ? { homeScore: 1, awayScore: 0 } : { homeScore: 0, awayScore: 1 });
 await expect(f.act({ kind: "enrich_goal", eventId: goal.commandEventId, scorerId: f.playerId })).rejects.toThrow("PLAYER_TEAM_SIDE_MISMATCH");
 await f.act({ kind: "correct_goal", eventId: goal.commandEventId });
 expect(await f.row()).toMatchObject({ homeScore: 0, awayScore: 0 });
 expect((await f.events()).filter(e => e.type === "goal")).toHaveLength(1);
});
