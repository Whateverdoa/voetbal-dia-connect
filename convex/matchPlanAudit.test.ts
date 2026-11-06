// @vitest-environment node
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { makeFunctionReference } from "convex/server";
import schema from "./schema";
import { api } from "./_generated/api";
import { startingLineupRevision } from "../src/lib/startingLineupRevision";

const modules = {
  "./matchLineupCore.ts": () => import("./matchLineupCore"),
  "./matchLineupAvailability.ts": () => import("./matchLineupAvailability"),
  "./substitutionPlans.ts": () => import("./substitutionPlans"),
  "./matchPlanAudit.ts": () => import("./matchPlanAudit"),
  "./coachAssistant.ts": () => import("./coachAssistant"),
  "./_generated/server.ts": () => import("./_generated/server"),
};
const audit = makeFunctionReference<"query">("matchPlanAudit:get");
async function fixture(existing = false) {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const clubId = await ctx.db.insert("clubs", { name: "Club", slug: "club", createdAt: 1 });
    const teamId = await ctx.db.insert("teams", { name: "Team", slug: "team", clubId, createdAt: 1 });
    const otherTeam = await ctx.db.insert("teams", { name: "Ander", slug: "ander", clubId, createdAt: 1 });
    const coachId = await ctx.db.insert("coaches", { name: "Max", email: "max@example.test", teamIds: [teamId], createdAt: 1 });
    await ctx.db.insert("coaches", { name: "Mike", email: "mike@example.test", teamIds: [teamId], createdAt: 1 });
    await ctx.db.insert("coaches", { name: "Andere coach", email: "other@example.test", teamIds: [otherTeam], createdAt: 1 });
    await ctx.db.insert("userAccess", { email: "admin@example.test", roles: ["admin"], active: true, source: "admin_manual", createdAt: 1, updatedAt: 1, lastSyncedAt: 1 });
    const matchId = await ctx.db.insert("matches", { teamId, coachId, publicCode: "AUDIT1", opponent: "Test", isHome: true, status: "scheduled", currentQuarter: 1, quarterCount: 2, homeScore: 0, awayScore: 0, showLineup: false, createdAt: 1,
      ...(existing ? { formationId: "11v11_1-4-3-3" } : {}) });
    const p1 = await ctx.db.insert("players", { name: "Een", teamId, active: true, createdAt: 1 });
    const p2 = await ctx.db.insert("players", { name: "Twee", teamId, active: true, createdAt: 1 });
    await ctx.db.insert("matchPlayers", { matchId, playerId: p1, onField: existing, isKeeper: false, createdAt: 1 });
    await ctx.db.insert("matchPlayers", { matchId, playerId: p2, onField: false, isKeeper: false, createdAt: 1 });
    return { matchId, p1, p2 };
  });
  return { t, ...ids,
    max: t.withIdentity({ subject: "max-subject", email: "max@example.test", name: "Max JWT" }),
    mike: t.withIdentity({ subject: "mike-subject", email: "mike@example.test", name: "Mike JWT" }),
    admin: t.withIdentity({ subject: "admin-subject", email: "admin@example.test", name: "Beheer gebruiker" }),
    other: t.withIdentity({ subject: "other-subject", email: "other@example.test" }),
  };
}

describe("authenticated plan attribution", () => {
  it("resets a confirmed pregame lineup atomically, retaining availability and the plan", async () => {
    const f = await fixture(true);
    const planId = await f.max.mutation(api.substitutionPlans.addPlanItem, { matchId: f.matchId, playerOutId: f.p1, playerInId: f.p2, targetMinute: 10 });
    const before = await f.t.run(async (ctx) => {
      const rows = await ctx.db.query("matchPlayers").withIndex("by_match", (q) => q.eq("matchId", f.matchId)).collect();
      const first = rows.find((row) => row.playerId === f.p1)!;
      const second = rows.find((row) => row.playerId === f.p2)!;
      await ctx.db.patch(first._id, { isKeeper: true, fieldSlotIndex: 0 });
      await ctx.db.patch(second._id, { injured: true });
      return ctx.db.query("matchPlayers").withIndex("by_match", (q) => q.eq("matchId", f.matchId)).collect();
    });
    await f.mike.mutation(api.coachAssistant.resetStartingLineup, { matchId: f.matchId, expectedRevision: startingLineupRevision(before), confirmed: true });
    await f.t.run(async (ctx) => {
      for (const row of before) {
        expect(await ctx.db.get(row._id)).toEqual({ ...row, onField: false, isKeeper: false, fieldSlotIndex: undefined });
      }
      expect(await ctx.db.get(planId)).not.toBeNull();
    });
    const data = await f.max.query(audit, { matchId: f.matchId });
    expect(data.lineup.latest.name).toBe("Mike");
    expect(data.lineup.latest.action).toBe("Beginopstelling leeggemaakt");
  });
  it("refuses unconfirmed, unauthorized, stale and started-match resets", async () => {
    const f = await fixture(true);
    const rows = await f.t.run((ctx) => ctx.db.query("matchPlayers").withIndex("by_match", (q) => q.eq("matchId", f.matchId)).collect());
    const args = { matchId: f.matchId, expectedRevision: startingLineupRevision(rows), confirmed: true };
    await expect(f.max.mutation(api.coachAssistant.resetStartingLineup, { ...args, confirmed: false })).rejects.toThrow("Bevestig");
    await expect(f.other.mutation(api.coachAssistant.resetStartingLineup, args)).rejects.toThrow();
    await expect(f.max.mutation(api.coachAssistant.resetStartingLineup, { ...args, expectedRevision: "old" })).rejects.toThrow("andere coach");
    await f.t.run((ctx) => ctx.db.patch(f.matchId, { startedAt: 123 }));
    await expect(f.max.mutation(api.coachAssistant.resetStartingLineup, args)).rejects.toThrow("aftrap");
    expect((await f.max.query(audit, { matchId: f.matchId })).history).toHaveLength(0);
  });
  it("finds the actual creator after availability was recorded on an empty lineup", async () => {
    const f = await fixture();
    await f.mike.mutation(api.matchLineupAvailability.togglePlayerAbsent, { matchId: f.matchId, playerId: f.p2 });
    expect((await f.max.query(audit, { matchId: f.matchId })).lineup.creator).toBeNull();
    await f.max.mutation(api.matchLineupCore.setMatchFormation, { matchId: f.matchId, formationId: "11v11_1-4-3-3" });
    const data = await f.max.query(audit, { matchId: f.matchId });
    expect(data.lineup.creator.name).toBe("Max");
    expect(data.history).toHaveLength(2);
  });
  it("keeps the creator and records a different signed-in editor", async () => {
    const f = await fixture();
    await f.max.mutation(api.matchLineupCore.setMatchFormation, { matchId: f.matchId, formationId: "11v11_1-4-3-3" });
    await f.mike.mutation(api.matchLineupCore.assignPlayerToSlot, { matchId: f.matchId, playerId: f.p1, fieldSlotIndex: 1 });
    const data = await f.max.query(audit, { matchId: f.matchId });
    expect(data.lineup.creator.name).toBe("Max");
    expect(data.lineup.latest.name).toBe("Mike");
    expect(data.history).toHaveLength(2);
    expect(JSON.stringify(data)).not.toContain("@example.test");
    expect(JSON.stringify(data)).not.toContain("subject");
  });
  it("does not invent a creator for an existing lineup or attribute an admin to the assigned coach", async () => {
    const f = await fixture(true);
    await f.admin.mutation(api.matchLineupCore.assignPlayerToSlot, { matchId: f.matchId, playerId: f.p1, fieldSlotIndex: 1 });
    const data = await f.max.query(audit, { matchId: f.matchId });
    expect(data.lineup.creator).toBeNull();
    expect(data.lineup.latest.name).toBe("Beheer gebruiker");
  });
  it("ignores no-ops and rolls back unauthorized or failed changes", async () => {
    const f = await fixture(true);
    await f.max.mutation(api.matchLineupCore.setMatchFormation, { matchId: f.matchId, formationId: "11v11_1-4-3-3" });
    await expect(f.other.mutation(api.matchLineupCore.togglePlayerOnField, { matchId: f.matchId, playerId: f.p1 })).rejects.toThrow();
    await expect(f.max.mutation(api.substitutionPlans.addPlanItem, { matchId: f.matchId, playerOutId: f.p1, playerInId: f.p1 })).rejects.toThrow();
    expect((await f.max.query(audit, { matchId: f.matchId })).history).toHaveLength(0);
    await expect(f.other.query(audit, { matchId: f.matchId })).rejects.toThrow();
    await expect(f.t.query(audit, { matchId: f.matchId })).rejects.toThrow();
  });
  it("records plan creation, another editor and deletion without losing history", async () => {
    const f = await fixture(true);
    const planId = await f.max.mutation(api.substitutionPlans.addPlanItem, { matchId: f.matchId, playerOutId: f.p1, playerInId: f.p2, targetMinute: 10 });
    await f.mike.mutation(api.substitutionPlans.updatePlanItem, { planId, targetMinute: 15 });
    await f.mike.mutation(api.substitutionPlans.removePlanItem, { planId });
    const data = await f.max.query(audit, { matchId: f.matchId });
    expect(data.plan.creator.name).toBe("Max");
    expect(data.plan.latest.name).toBe("Mike");
    expect(data.plan.latest.action).toBe("Wisselregel verwijderd");
    expect(data.history).toHaveLength(3);
    expect(data.lineup.latest).toBeNull();
  });
});
