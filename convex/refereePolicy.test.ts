/// <reference types="vite/client" />
// @vitest-environment node
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import schema from "./schema";
import { enforceRefereeClock, projectRefereeClock, saveRefereeClock } from "./lib/refereeMatchPolicy";
import type { Id } from "./_generated/dataModel";
const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts", "!./auth.config.ts"]);
const minute = 60_000;
const guard = makeFunctionReference<"mutation", { matchId: Id<"matches">; generation: number }, null>("refereePolicy:guardClock");
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(1_700_000_000_000); });
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); });

async function fixture(count = 2, minutes = 30, margin = 10) {
 const t = convexTest(schema, modules);
 const kickoff = Date.now();
 const matchId = await t.run(async ctx => {
  const clubId = await ctx.db.insert("clubs", { name: "Local", slug: "local", createdAt: kickoff });
  const teamId = await ctx.db.insert("teams", { clubId, name: "Local", slug: "local", createdAt: kickoff });
  return ctx.db.insert("matches", { teamId, publicCode: "LOCAL", opponent: "Local only", isHome: true, status: "live",
   currentQuarter: 1, quarterCount: count, regulationDurationMinutes: count * minutes,
   homeScore: 2, awayScore: 1, showLineup: false, quarterStartedAt: kickoff, createdAt: kickoff,
   refereePolicy: { version: 1, generation: 1, commandVersion: 0, elapsedMs: 0, runningSince: kickoff, periodStartedElapsedMs: 0,
    safetyMarginMinutes: margin, confirmedStoppageMs: 0 } });
 });
 const row = () => t.run(ctx => ctx.db.get(matchId));
 const check = () => t.run(async ctx => enforceRefereeClock(ctx, (await ctx.db.get(matchId))!, Date.now()));
 return { t, matchId, kickoff, row, check };
}

describe("opt-in referee clock persistence", () => {
 for (const [count, minutes] of [[2, 30], [2, 45], [4, 15]]) for (const margin of [0, 10, 30]) {
  it(`${count}x${minutes}, margin ${margin}: exact limit after 600 minutes and one system audit`, async () => {
   const f = await fixture(count, minutes, margin);
   vi.setSystemTime(f.kickoff + 600 * minute);
   const projection = projectRefereeClock((await f.row())!, Date.now())!;
   expect(projection.state.elapsedMs).toBe((minutes + margin) * minute);
   expect(projection.effectiveAt).toBe(f.kickoff + (minutes + margin) * minute);
   await f.check(); await f.check();
   const row = (await f.row())!;
   expect(row).toMatchObject({ homeScore: 2, awayScore: 1, status: "live", currentQuarter: 1,
    pausedAt: f.kickoff + (minutes + margin) * minute,
    refereePolicy: { runningSince: null, clockReviewReason: "period_limit", confirmedStoppageMs: 0 } });
   const events = await f.t.run(ctx => ctx.db.query("matchEvents").withIndex("by_match", q => q.eq("matchId", f.matchId)).take(10));
   expect(events).toHaveLength(1);
   expect(events[0]).toMatchObject({ type: "clock_guard", actorKind: "system", effectiveAt: projection.effectiveAt });
   expect(events[0]).not.toHaveProperty("actorSubject");
  });
 }
 it("rejects missing anchors without inventing elapsed time", async () => {
  const f = await fixture();
  await f.t.run(async ctx => { const match = (await ctx.db.get(f.matchId))!;
   await ctx.db.patch(f.matchId, { refereePolicy: { ...match.refereePolicy!, periodStartedElapsedMs: undefined } }); });
  await f.check();
  expect((await f.row())!.refereePolicy).toMatchObject({ elapsedMs: 0, runningSince: null, clockReviewReason: "unknown_anchor" });
 });
 it("flags an open 600-minute interruption without silently confirming it", async () => {
  const f = await fixture();
  await f.t.run(async ctx => { const match = (await ctx.db.get(f.matchId))!;
   await ctx.db.patch(f.matchId, { refereePolicy: { ...match.refereePolicy!, elapsedMs: 12 * minute, runningSince: null, stoppageStartedAt: f.kickoff } }); });
  vi.setSystemTime(f.kickoff + 600 * minute);
  await f.check();
  expect((await f.row())!.refereePolicy).toMatchObject({ elapsedMs: 12 * minute, confirmedStoppageMs: 0, stoppageStartedAt: f.kickoff, clockReviewReason: "long_stoppage" });
 });
 it("ignores stale scheduled jobs and executes the current generation", async () => {
  const f = await fixture();
  await f.t.run(async ctx => saveRefereeClock(ctx, (await ctx.db.get(f.matchId))!, Date.now()));
  vi.setSystemTime(f.kickoff + 600 * minute);
  await f.t.mutation(guard, { matchId: f.matchId, generation: 1 });
  expect((await f.row())!.refereePolicy!.runningSince).toBe(f.kickoff);
  await f.t.mutation(guard, { matchId: f.matchId, generation: 2 });
  expect((await f.row())!.refereePolicy!.runningSince).toBeNull();
 });
 it("an old automatic break-resume cannot restart an opted-in match", async () => {
  const f = await fixture();
  await f.t.run(ctx => ctx.db.patch(f.matchId, { status: "halftime", scheduledBreakEndAt: Date.now() }));
  const resume = makeFunctionReference<"mutation", { matchId: Id<"matches">; expectedBreakEndAt: number }>("breakClockActions:autoResumeFromBreak");
  await f.t.mutation(resume, { matchId: f.matchId, expectedBreakEndAt: Date.now() });
  expect((await f.row())!.status).toBe("halftime");
 });
});

it("all legacy official write paths reject the opted-in match", async () => {
 const f = await fixture();
 const goalId = await f.t.run(ctx => ctx.db.insert("matchEvents", { matchId: f.matchId, type: "goal", quarter: 1, timestamp: Date.now(), createdAt: Date.now() }));
 const routes: [string, Record<string, string | number | boolean>][] = [
  ["clockActions:pauseClock", {}], ["clockActions:resumeClock", {}],
  ["stoppageActions:startStoppage", {}], ["stoppageActions:endStoppage", {}],
  ["matchLifecycleActions:start", {}], ["matchLifecycleActions:nextQuarter", {}], ["matchLifecycleActions:resumeFromHalftime", {}],
  ["scoreActions:adjustScore", { team: "home", delta: -1, correlationId: "legacy" }],
  ["matchEvents:addGoal", {}], ["matchEvents:removeLastGoal", {}],
  ["matchCardActions:addCard", { cardType: "yellow_card" }],
  ["matchGoalEnrichmentActions:enrichGoal", { eventId: goalId, correlationId: "legacy-enrich" }],
  ["matchPregameActions:updateStatus", { status: "finished" }], ["matchPregameActions:updateMatchMetadata", { quarterCount: 2 }],
  ["breakClockActions:configureBreakClock", { useBreakClock: true, breakClockAutoStart: true }],
  ["matchLeadActions:claimMatchLead", {}], ["matchLeadActions:releaseMatchLead", {}], ["refereeActions:assignReferee", {}],
 ];
 for (const [path, args] of routes) {
  const ref = makeFunctionReference<"mutation", Record<string, string | number | boolean>>(path);
  await expect(f.t.mutation(ref, { matchId: f.matchId, ...args })).rejects.toThrow("Gebruik de nieuwe wedstrijdregistratie");
 }
 expect(await f.row()).toMatchObject({ homeScore: 2, awayScore: 1, status: "live" });
 expect(await f.t.run(ctx => ctx.db.get(goalId))).not.toBeNull();
});
