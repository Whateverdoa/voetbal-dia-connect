// @vitest-environment node
import { convexTest } from "convex-test";
import { makeFunctionReference as ref } from "convex/server";
import { expect, it } from "vitest";
import schema from "./schema";
import { validateTimingUpdate, emptyTiming, publicInterruptionTiming } from "./lib/interruptionTiming";
import type { Doc } from "./_generated/dataModel";
const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts"]);
import { executeRefereeRegistration as execute } from "./lib/refereeRegistration";
import { readRefereeDetail } from "./lib/refereeMatchRead";
import { pilotIdentity, officialDutyEligibility } from "./lib/mobilePilotAccess";
const id = "12345678-1234-1234-1234-123456789abc";
const closed = { measurements: [{ id, kind: "incident" as const, period: 1, startedElapsedMs: 0, endedElapsedMs: 20000, included: true }], chosenSeconds: { "1": 20 } };
function match() { return { status: "live", currentQuarter: 1, quarterCount: 2, refereePolicy: { runningSince: 1, periodStartedElapsedMs: 0, safetyMarginMinutes: 10 } } as Doc<"matches">; }
it("validates append-only observations, explicit long review, no overlap, future or additive extra time", () => {
  expect(validateTimingUpdate(match(), closed, 20000)).toEqual(closed);
  expect(validateTimingUpdate(match(), { ...closed, measurements: [{ ...closed.measurements[0], id: id.toUpperCase() }] }, 20000)).toEqual(closed);
  const old = { ...match(), refereePolicy: { ...match().refereePolicy!, interruptionTiming: closed } };
  expect(() => validateTimingUpdate(old, emptyTiming(), 30000)).toThrow();
  expect(() => validateTimingUpdate(old, { ...closed, measurements: [{ ...closed.measurements[0], endedElapsedMs: 19000 }] }, 30000)).toThrow();
  expect(() => validateTimingUpdate(match(), closed, 19000)).toThrow();
  expect(() => validateTimingUpdate(match(), { ...closed, chosenSeconds: { "2": 20 } }, 30000)).toThrow();
  expect(() => validateTimingUpdate(match(), { ...closed, chosenSeconds: { "1": 601 } }, 30000)).toThrow();
  const long = { measurements: [{ ...closed.measurements[0], endedElapsedMs: 900000 }], chosenSeconds: {} };
  expect(() => validateTimingUpdate(match(), long, 900000)).toThrow();
  const review = { measurements: [{ id, period: 1, kind: "incident" as const, startedElapsedMs: 0, endedElapsedMs: 900000 }], chosenSeconds: {} };
  expect(validateTimingUpdate(match(), review, 900000)).toEqual(review);
  expect(() => validateTimingUpdate({ ...old, refereePolicy: { ...old.refereePolicy, interruptionTiming: review } } as Doc<"matches">, { ...review, chosenSeconds: { "1": 1 } }, 900000)).toThrow();
});
it("publishes only a minimal summary, with separate open anchor and no duplicate seconds", () => {
  expect(publicInterruptionTiming(closed, 50000)).toEqual([{ period: 1, measuredMs: 20000, activeStartedElapsedMs: undefined, active: false, needsReview: false, chosenSeconds: 20 }]);
  const open = { measurements: [{ id, period: 1, kind: "incident" as const, startedElapsedMs: 0 }], chosenSeconds: {} };
  expect(publicInterruptionTiming(open, 600 * 60000)?.[0]).toMatchObject({ measuredMs: 0, active: true, needsReview: true });
  expect(JSON.stringify(publicInterruptionTiming(closed, 50000))).not.toContain(id);
});
it("real query/mutation flow shares confirmed timing and incident categories without changing score or clock", async () => {
  const t = convexTest(schema, modules);
  const matchId = await t.run(async ctx => {
    const clubId = await ctx.db.insert("clubs", { name: "Local", slug: "local", createdAt: 1 });
    const teamId = await ctx.db.insert("teams", { clubId, name: "Sandbox", slug: "sandbox", createdAt: 1 });
    const refereeId = await ctx.db.insert("referees", { name: "Ref", active: true, createdAt: 1 });
    await ctx.db.insert("userAccess", { email: "timing@example.test", roles: ["referee"], refereeId, active: true, source: "admin_manual", lastSyncedAt: 1, createdAt: 1, updatedAt: 1 });
    const m = await ctx.db.insert("matches", { teamId, refereeId, publicCode: "LOCAL", opponent: "Opponent", isHome: true, status: "live", currentQuarter: 1, quarterCount: 2, regulationDurationMinutes: 60, homeScore: 2, awayScore: 1, showLineup: false, createdAt: 1,
      refereePolicy: { version: 1, generation: 1, commandVersion: 0, elapsedMs: 20000, runningSince: null, periodStartedElapsedMs: 0, safetyMarginMinutes: 10, confirmedStoppageMs: 0 } });
    await ctx.db.insert("matchEvents", { matchId: m, type: "incident", note: "Blessure: PRIVATE medical details", quarter: 1, timestamp: 1, createdAt: 1 });
    return m;
  });
  const owner = t.withIdentity({ subject: "timing-ref", email: "timing@example.test", emailVerified: true });
  const act = (args: Parameters<typeof execute>[1]) => owner.run(ctx => execute(ctx, args));
  const args = { matchId, expectedVersion: 0, correlationId: "timing-one", action: { kind: "sync_interruption_timing" as const, timing: closed } };
  const receipt = await act( args);
  expect(await act( args)).toEqual(receipt);
  await expect(act( { ...args, action: { ...args.action, timing: { ...closed, chosenSeconds: { "1": 0 } } } })).rejects.toThrow("CORRELATION_CONTENT_MISMATCH");
  const detail = await owner.run(async ctx => {
    const actor = await pilotIdentity(ctx), match = (await ctx.db.get(matchId))!;
    return readRefereeDetail(ctx, { subject: actor.subject, match, team: (await ctx.db.get(match.teamId))!, ...await officialDutyEligibility(ctx, match, actor.access) }, true, Date.now() + 3600000);
  });
  expect(detail.interruptionTiming).toEqual(closed);
  const pub = await t.query(ref<"query">("matches:getByPublicCode"), { code: "LOCAL" });
  expect(pub.refereeClock.interruptionTiming[0]).toMatchObject({ measuredMs: 20000, chosenSeconds: 20 });
  expect(pub.events[0]).toMatchObject({ type: "incident", incidentCategory: "Blessure" });
  expect(JSON.stringify(pub)).not.toContain("PRIVATE");
  const saved = await t.run(ctx => ctx.db.get(matchId));
  expect(saved).toMatchObject({ homeScore: 2, awayScore: 1, refereePolicy: { elapsedMs: 20000, runningSince: null, safetyMarginMinutes: 10 } });
  await t.run(async ctx => {
    const current = (await ctx.db.get(matchId))!;
    await ctx.db.patch(matchId, { refereePolicy: { ...current.refereePolicy!, runningSince: Date.now() } });
  });
  await act( { matchId, expectedVersion: 1, correlationId: "open-before-boundary",
    action: { kind: "sync_interruption_timing", timing: { measurements: [...closed.measurements, { id: "22345678-1234-1234-1234-123456789abc", period: 1, kind: "interruption", startedElapsedMs: 20000 }], chosenSeconds: closed.chosenSeconds } } });
  await act( { matchId, expectedVersion: 2, correlationId: "end-boundary", action: { kind: "end_period" } });
  const ended = await t.run(ctx => ctx.db.get(matchId));
  expect(ended?.refereePolicy?.interruptionTiming?.measurements.at(-1)?.endedElapsedMs).toBe(ended?.refereePolicy?.elapsedMs);
  expect(ended?.status).toBe("halftime");
  const audits = await t.run(ctx => ctx.db.query("matchEvents").withIndex("by_match", q => q.eq("matchId", matchId)).collect());
  expect(audits.filter(e => e.commandType === "SYSTEM_INTERRUPTION_BOUNDARY")).toHaveLength(1);
  expect(audits.find(e => e.commandType === "SYSTEM_INTERRUPTION_BOUNDARY")?.actorKind).toBe("system");
  await t.run(ctx => ctx.db.patch(matchId, { refereeId: undefined }));
  await expect(act( args)).rejects.toThrow();
});

it("keeps each format/period/margin isolated and refuses forged future/overlapping history", () => {
  for (const [periods, minutes] of [[2,30],[2,45],[4,15]]) for (const margin of [0,10,30]) {
    for (let period=1; period<=periods; period++) {
      const start=(period-1)*minutes*60000;
      const source={ ...match(), currentQuarter:period, quarterCount:periods, refereePolicy:{ ...match().refereePolicy!, periodStartedElapsedMs:start, safetyMarginMinutes:margin } } as Doc<"matches">;
      const timing={measurements:[{id,period,kind:"interruption" as const,startedElapsedMs:start,endedElapsedMs:start+1000,included:true}],chosenSeconds:{[period]:margin*60}};
      expect(validateTimingUpdate(source,timing,start+1000)).toEqual(timing);
      expect(() => validateTimingUpdate(source,{...timing,chosenSeconds:{[period]:margin*60+1}},start+1000)).toThrow();
      expect(() => validateTimingUpdate(source,{...timing,measurements:[...timing.measurements,{...timing.measurements[0],id:"22345678-1234-1234-1234-123456789abc"}]},start+1000)).toThrow();
    }
  }
});

it("closes a shared open measurement at the exact safety boundary after 600 minutes, without booking it silently", async () => {
  const t=convexTest(schema,modules);
  const matchId=await t.run(async ctx=>{
    const clubId=await ctx.db.insert("clubs",{name:"Local",slug:"clock-local",createdAt:1});
    const teamId=await ctx.db.insert("teams",{clubId,name:"Local",slug:"clock-local",createdAt:1});
    return await ctx.db.insert("matches",{teamId,publicCode:"CLOCK",opponent:"Synthetic",isHome:true,status:"live",currentQuarter:1,quarterCount:2,regulationDurationMinutes:60,homeScore:2,awayScore:1,showLineup:false,createdAt:1,
      refereePolicy:{version:1,generation:1,commandVersion:0,elapsedMs:0,runningSince:1000000,periodStartedElapsedMs:0,safetyMarginMinutes:10,confirmedStoppageMs:0,
        interruptionTiming:{measurements:[{id,period:1,kind:"interruption",startedElapsedMs:0}],chosenSeconds:{}}}});
  });
  const {enforceRefereeClock}=await import("./lib/refereeMatchPolicy");
  await t.run(async ctx=>{await enforceRefereeClock(ctx,(await ctx.db.get(matchId))!,1000000+600*60000);});
  const ended=await t.run(ctx=>ctx.db.get(matchId));
  expect(ended).toMatchObject({status:"live",currentQuarter:1,homeScore:2,awayScore:1,refereePolicy:{elapsedMs:2400000,runningSince:null,clockReviewReason:"period_limit"}});
  expect(ended?.refereePolicy?.interruptionTiming?.measurements[0]).toMatchObject({endedElapsedMs:2400000});
  expect(ended?.refereePolicy?.interruptionTiming?.measurements[0].included).toBeUndefined();
  expect(publicInterruptionTiming(ended?.refereePolicy?.interruptionTiming,2400000)?.[0]).toMatchObject({measuredMs:0,active:false,needsReview:true});
  const audits=await t.run(ctx=>ctx.db.query("matchEvents").withIndex("by_match",q=>q.eq("matchId",matchId)).collect());
  expect(audits.find(e=>e.commandType==="SYSTEM_INTERRUPTION_BOUNDARY")).toMatchObject({actorKind:"system",effectiveAt:3400000,matchMs:2400000});
  await t.run(async ctx=>{await enforceRefereeClock(ctx,(await ctx.db.get(matchId))!,1000000+601*60000);});
  const again=await t.run(ctx=>ctx.db.query("matchEvents").withIndex("by_match",q=>q.eq("matchId",matchId)).collect());
  expect(again.filter(e=>e.commandType==="SYSTEM_INTERRUPTION_BOUNDARY")).toHaveLength(1);
});

it("allows metadata review with an unchanged open interval during a real clock pause, but never a new open interval", () => {
 const reviewed = { id,period:1,kind:"incident" as const,startedElapsedMs:0,endedElapsedMs:900000 };
 const open = { id:"22345678-1234-1234-1234-123456789abc",period:1,kind:"interruption" as const,startedElapsedMs:900000 };
 const timing = {measurements:[reviewed,open],chosenSeconds:{}};
 const paused = {...match(),refereePolicy:{...match().refereePolicy!,runningSince:null,safetyMarginMinutes:30,interruptionTiming:timing}};
 const updated = {...timing,measurements:[{...reviewed,included:true},open]};
 expect(validateTimingUpdate(paused,updated,910000)).toEqual(updated);
 expect(() => validateTimingUpdate({...paused,refereePolicy:{...paused.refereePolicy,interruptionTiming:{measurements:[reviewed],chosenSeconds:{}}}},timing,910000)).toThrow("INTERRUPTION_TIMING_CONFLICT");
});
