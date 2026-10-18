// @vitest-environment node
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import { expect, it } from "vitest";
import schema from "../schema";
import { buildFinishedScorePatch } from "./syncScoreApply";
const modules = {
  "./import/sportlinkUpsert.ts": () => import("./sportlinkUpsert"),
  "./import/syncWedstrijdenToMatches.ts": () => import("./syncWedstrijdenToMatches"),
  "./_generated/server.ts": () => import("../_generated/server"),
};
const policy = { version: 1 as const, commandVersion: 7, generation: 3, elapsedMs: 12000, runningSince: null, periodStartedElapsedMs: 0, safetyMarginMinutes: 10, confirmedStoppageMs: 0 };
async function fixture(protectedMatch = true) {
  const t = convexTest(schema, modules);
  const matchId = await t.run(async ctx => {
    const clubId = await ctx.db.insert("clubs", { name: "Synthetic", slug: "local", createdAt: 1 });
    const teamId = await ctx.db.insert("teams", { clubId, name: "DIA JO13-2", slug: "jo13-2", createdAt: 1 });
    await ctx.db.insert("userAccess", { email: "admin@local.test", roles: ["admin"], active: true, source: "admin_manual", createdAt: 1, updatedAt: 1, lastSyncedAt: 1 });
    return ctx.db.insert("matches", { teamId, publicCode: "LOCAL", opponent: "Original", isHome: true, scheduledAt: 1000,
      sportlinkWedstrijdcode: "LOCAL-CODE", status: "scheduled", currentQuarter: 1, quarterCount: 2,
      homeScore: 1, awayScore: 0, showLineup: false, createdAt: 1, ...(protectedMatch ? { refereePolicy: policy } : {}) });
  });
  return { t, matchId, admin: t.withIdentity({ subject: "local-admin", email: "admin@local.test", emailVerified: true }) };
}
it.each([false, true])("Sportlink upsert skips protected fixtures without any metadata/score/clock writes (dry=%s)", async dryRun => {
  const f = await fixture(); const before = await f.t.run(ctx => ctx.db.get(f.matchId));
  const result = await f.admin.mutation(makeFunctionReference<"mutation">("import/sportlinkUpsert:upsertBySportlinkCode"), {
    teamSlug: "jo13-2", sportlinkWedstrijdcode: "LOCAL-CODE", opponent: "Changed", isHome: false, scheduledAt: 999999,
    finished: true, homeScore: 9, awayScore: 8, dryRun,
  });
  expect(result).toMatchObject({ action: "skipped_referee_policy", matchId: f.matchId });
  expect(await f.t.run(ctx => ctx.db.get(f.matchId))).toEqual(before);
});
it("Sportlink upsert retains existing behavior for unprotected fixtures", async () => {
  const f = await fixture(false);
  await f.admin.mutation(makeFunctionReference<"mutation">("import/sportlinkUpsert:upsertBySportlinkCode"), {
    teamSlug: "jo13-2", sportlinkWedstrijdcode: "LOCAL-CODE", opponent: "Changed", isHome: false, scheduledAt: 999999,
    finished: true, homeScore: 9, awayScore: 8, dryRun: false,
  });
  expect(await f.t.run(ctx => ctx.db.get(f.matchId))).toMatchObject({ homeScore: 9, awayScore: 8, status: "finished" });
});
it.each(["gespeeld", "afgelast", "gepland"])("weekly sync cannot update/cancel/reseed protected fixtures for status %s", async status => {
  const f = await fixture(); const before = await f.t.run(ctx => ctx.db.get(f.matchId));
  await f.t.run(ctx => ctx.db.insert("wedstrijden", { voetbalassist_id: 1, datum: "2026-10-17", tijd: "09:00", datum_ms: 999999,
    thuisteam: "DIA JO13-2", uitteam: "Changed", thuis_goals: 9, uit_goals: 8, status, type: "test", categorie: "test", leeftijd: 13,
    dia_team: "JO13-2", veld: "1", scheidsrechter: "", sportlink_wedstrijdcode: "LOCAL-CODE" }));
  const result = await f.admin.mutation(makeFunctionReference<"mutation">("import/syncWedstrijdenToMatches:syncAll"), { dryRun: false });
  expect(result).toMatchObject({ skippedExisting: 1, updatedFinished: 0, updatedScheduledAt: 0, cancelledMatches: 0 });
  expect(await f.t.run(ctx => ctx.db.get(f.matchId))).toEqual(before);
  expect(await f.t.run(ctx => ctx.db.query("matchPlayers").collect())).toEqual([]);
});
it.each(["scheduled", "lineup", "live", "halftime", "finished"] as const)("score helper preserves protected %s matches including finished results", status => {
  expect(buildFinishedScorePatch({ status, homeScore: 1, awayScore: 0, refereePolicy: policy }, 9, 8, 999999)).toEqual({ result: { kind: "skipped_referee_policy" }, patch: {} });
});
