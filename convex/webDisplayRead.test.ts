/// <reference types="vite/client" />
// @vitest-environment node
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import { describe, expect, it } from "vitest";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";
import { computeElapsedMs, computeActualElapsedMs } from "../src/lib/matchClock/engine";
import { refereeDisplayClock } from "./lib/refereeMatchPolicy";
const modules = import.meta.glob(["./**/*.ts", "!./**/*.test.ts", "!./auth.config.ts"]);

describe("read-only web clock and corrections contract", () => {
  it("public and referee queries preserve exact final time, target corrections and stored data", async () => {
    const t = convexTest(schema, modules);
    const { matchId, correctedGoal } = await t.run(async ctx => {
      const clubId = await ctx.db.insert("clubs", { name: "Local", slug: "local", createdAt: 1 });
      const teamId = await ctx.db.insert("teams", { clubId, name: "Sandbox", slug: "sandbox", createdAt: 1 });
      const refereeId = await ctx.db.insert("referees", { name: "Ref", email: "ref@example.test", active: true, createdAt: 1 });
      await ctx.db.insert("userAccess", { email: "ref@example.test", roles: ["referee"], refereeId, active: true,
        source: "admin_manual", lastSyncedAt: 1, createdAt: 1, updatedAt: 1 });
      const matchId = await ctx.db.insert("matches", { teamId, refereeId, publicCode: "LOCAL", opponent: "Local opponent",
        isHome: true, status: "finished", currentQuarter: 2, quarterCount: 2,
        homeScore: 2, awayScore: 0, showLineup: false, createdAt: 1,
        frozenClockMs: 4296254, refereePolicy: { version: 1, generation: 17, commandVersion: 17,
          elapsedMs: 4296254, periodStartedElapsedMs: 1896254, runningSince: null, confirmedStoppageMs: 0, safetyMarginMinutes: 10 } });
      const correctedGoal = await ctx.db.insert("matchEvents", { matchId, type: "goal", quarter: 1, timestamp: 2, createdAt: 2, matchMs: 335835 });
      await ctx.db.insert("matchEvents", { matchId, type: "goal_correction", quarter: 1, timestamp: 3, createdAt: 3, targetEventId: correctedGoal, matchMs: 345670 });
      return { matchId, correctedGoal };
    });
    const before = await t.run(ctx => ctx.db.get(matchId));
    const pub = await t.query(makeFunctionReference<"query", { code: string }>("matches:getByPublicCode"), { code: "LOCAL" });
    const referee = await t.withIdentity({ subject: "ref", email: "ref@example.test", emailVerified: true })
      .query(makeFunctionReference<"query", { matchId: Id<"matches"> }>("matches:getForReferee"), { matchId });
    for (const view of [pub, referee]) {
      expect(view).not.toBeNull();
      expect(view.refereeClock).toMatchObject({ periodStartedElapsedMs: 1896254, elapsedMs: 4296254 });
      expect(view.refereeClock).not.toHaveProperty("generation");
      expect(view.refereeClock).not.toHaveProperty("commandVersion");
      expect(view.refereeClock).not.toHaveProperty("actorSubject");
      expect(computeElapsedMs({ ...view, regulationDurationMinutes: 60 }, Date.now())).toBe(4200000);
      expect(computeActualElapsedMs({ ...view, regulationDurationMinutes: 60 }, Date.now())).toBe(4296254);
      expect(view.events.find((e: { _id: string }) => e._id === correctedGoal)).toMatchObject({ corrected: true, matchMs: 335835 });
    }
    expect(await t.run(ctx => ctx.db.get(matchId))).toEqual(before);
    expect(await t.run(ctx => ctx.db.query("matchEvents").withIndex("by_match", q => q.eq("matchId", matchId)).take(10))).toHaveLength(2);
  });
  it("omits official display fields for legacy matches", () => {
    expect(refereeDisplayClock({ refereePolicy: undefined } as Parameters<typeof refereeDisplayClock>[0], Date.now())).toBeUndefined();
  });
});
