// @vitest-environment node
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import { afterEach, expect, it, vi } from "vitest";
import schema from "./schema";
import type { Id } from "./_generated/dataModel";
const modules = { "./refereeRegistration.ts": () => import("./refereeRegistration"), "./refereePolicy.ts": () => import("./refereePolicy"), "./_generated/server.ts": () => import("./_generated/server") };
const get = makeFunctionReference<"query", { matchId: Id<"matches"> }>("refereeRegistration:getMatch");
const command = makeFunctionReference<"mutation", { matchId: Id<"matches">; expectedVersion: number; correlationId: string; actorSubject?: string; action: { kind: "start" } }>("refereeRegistration:command");
afterEach(() => vi.unstubAllEnvs());
async function fixture() {
 const t = convexTest(schema, modules);
 const matchId = await t.run(async ctx => {
  const clubId = await ctx.db.insert("clubs", { name: "Local", slug: "local", createdAt: 1 });
  const teamId = await ctx.db.insert("teams", { clubId, name: "Local", slug: "local", createdAt: 1 });
  const refereeId = await ctx.db.insert("referees", { name: "Ref", email: "ref@example.test", active: true, createdAt: 1 });
  await ctx.db.insert("userAccess", { email: "admin@example.test", active: true, roles: ["admin"], source: "admin_manual", createdAt: 1, updatedAt: 1, lastSyncedAt: 1 });
  return ctx.db.insert("matches", { teamId, refereeId, publicCode: "LOCAL", opponent: "Local", isHome: true, status: "scheduled", currentQuarter: 1, quarterCount: 2,
   homeScore: 0, awayScore: 0, showLineup: false, createdAt: 1,
   refereePolicy: { version: 1, commandVersion: 0, generation: 0, elapsedMs: 0, runningSince: null, periodStartedElapsedMs: 0, confirmedStoppageMs: 0, safetyMarginMinutes: 10 } });
 });
 return { t, matchId, ref: t.withIdentity({ subject: "ref", email: "ref@example.test", emailVerified: true }),
  admin: t.withIdentity({ subject: "admin", email: "admin@example.test", emailVerified: true }),
  args: { matchId, expectedVersion: 0, correlationId: "web-start", action: { kind: "start" as const } } };
}
it("web writes default closed even on an enrolled match", async () => {
 vi.stubEnv("WEB_REFEREE_PILOT_WRITES_ENABLED", "false"); const f = await fixture();
 expect(await f.ref.query(get, { matchId: f.matchId })).toMatchObject({ writesEnabled: false, canControl: false });
 await expect(f.ref.mutation(command, f.args)).rejects.toThrow("WEB_PILOT_WRITES_DISABLED");
});
it("web never opens unmarked matches, even with its server gate enabled", async () => {
 vi.stubEnv("WEB_REFEREE_PILOT_WRITES_ENABLED", "true"); const f = await fixture();
 await f.t.run(ctx => ctx.db.patch(f.matchId, { refereePolicy: undefined }));
 expect(await f.ref.query(get, { matchId: f.matchId })).toBeNull();
 await expect(f.ref.mutation(command, f.args)).rejects.toThrow("PILOT_POLICY_REQUIRED");
});
it("web uses the shared core without inventing a mobile scope, and denies admin registration", async () => {
 vi.stubEnv("WEB_REFEREE_PILOT_WRITES_ENABLED", "true"); const f = await fixture();
 expect(await f.admin.query(get, { matchId: f.matchId })).toMatchObject({ canControl: false });
 await expect(f.admin.mutation(command, f.args)).rejects.toThrow("OFFICIAL_REGISTRATOR_REQUIRED");
 const receipt = await f.ref.mutation(command, f.args);
 expect(await f.ref.mutation(command, f.args)).toEqual(receipt);
 expect(await f.ref.query(get, { matchId: f.matchId })).toMatchObject({ status: "live", version: 1, canControl: true });
});
it("rejects prepared actions belonging to another account before changing the match", async () => {
 vi.stubEnv("WEB_REFEREE_PILOT_WRITES_ENABLED", "true"); const f = await fixture();
 await expect(f.ref.mutation(command, { ...f.args, actorSubject: "old-account" })).rejects.toThrow("SESSION_CHANGED");
 expect(await f.ref.query(get, { matchId: f.matchId })).toMatchObject({ status: "scheduled", version: 0 });
 expect(await f.t.run(ctx => ctx.db.query("matchEvents").collect())).toEqual([]);
});
