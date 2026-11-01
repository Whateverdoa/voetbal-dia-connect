// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = {
  "./standings.ts": () => import("./standings"),
  "./_generated/server.js": () => import("./_generated/server"),
};
const sunday = Date.parse("2026-11-01T10:30:00Z");

afterEach(() => vi.useRealTimers());

describe("anonymous standings monitoring", () => {
  it("exposes only cache health and a clearly global poll status", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(sunday);
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("standings", {
        teamSlug: "jo13-2", poulecode: "846592", competitionName: "Competitie",
        klassepoule: "2e klasse", sportlinkTeamName: "DIA O13-2JM", rows: [],
        fetchedAt: sunday - 1000, lastContentChangedAt: sunday - 900000,
      });
      await ctx.db.insert("standingsPollState", {
        key: "weekend", amsterdamDate: "2026-11-01", baselineFingerprint: "private-baseline",
        sawUpdate: true, updatedAt: sunday - 1000, attempts: 2,
        lastAttemptAt: sunday - 2000, lastCompletedAt: sunday - 1000,
        lastOutcome: "partial", failedPouleCount: 1,
      });
    });
    const result = await t.query(api.standings.getMonitoringByTeamSlug, { teamSlug: " JO13-2 " });
    expect(result).toMatchObject({
      teamSlug: "jo13-2", hasStanding: true, poulecode: "846592",
      lastSuccessfulFetchAt: sunday - 1000, lastContentChangedAt: sunday - 900000,
      polling: { scope: "global", attempts: 2, maxAttempts: 44, lastOutcome: "partial", status: "waiting" },
    });
    expect(result.polling.nextPollAt).toBe(Date.parse("2026-11-01T10:45:00Z"));
    expect(JSON.stringify(result)).not.toMatch(/baseline|private|sawUpdate|failedPoule|_id|rows/);
  });

  it("keeps a legacy change time unknown and reports missing standings honestly", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(sunday);
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("standings", {
        teamSlug: "jo13-2", poulecode: "846592", competitionName: "Competitie",
        klassepoule: "2e klasse", sportlinkTeamName: "DIA O13-2JM", rows: [], fetchedAt: sunday,
      });
    });
    expect(await t.query(api.standings.getMonitoringByTeamSlug, { teamSlug: "jo13-2" }))
      .toMatchObject({ hasStanding: true, lastContentChangedAt: null });
    expect(await t.query(api.standings.getMonitoringByTeamSlug, { teamSlug: "unknown" }))
      .toMatchObject({ hasStanding: false, lastSuccessfulFetchAt: null, lastContentChangedAt: null, poulecode: null });
  });

  it("reports an exhausted budget and the Monday catch-up, not another Sunday attempt", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(sunday);
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("standingsPollState", {
        key: "weekend", amsterdamDate: "2026-11-01", baselineFingerprint: "",
        sawUpdate: true, updatedAt: sunday, attempts: 44, lastOutcome: "unchanged",
      });
    });
    const result = await t.query(api.standings.getMonitoringByTeamSlug, { teamSlug: "jo13-2" });
    expect(result.polling).toMatchObject({ status: "daily_limit", attempts: 44, maxAttempts: 44 });
    expect(result.polling.nextPollAt).toBe(Date.parse("2026-11-02T10:00:00Z"));
  });

  it("distinguishes an active attempt from an expired lease and resets the visible daily counter", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(sunday);
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("standingsPollState", {
        key: "weekend", amsterdamDate: "2026-11-01", baselineFingerprint: "",
        sawUpdate: false, updatedAt: sunday, attempts: 1,
        lastOutcome: "running", leaseUntil: sunday + 600000,
      });
    });
    expect((await t.query(api.standings.getMonitoringByTeamSlug, { teamSlug: "jo13-2" })).polling.status).toBe("running");
    vi.setSystemTime(sunday + 600001);
    expect((await t.query(api.standings.getMonitoringByTeamSlug, { teamSlug: "jo13-2" })).polling.status).toBe("timed_out");
    vi.setSystemTime(Date.parse("2026-11-02T10:00:00Z"));
    expect((await t.query(api.standings.getMonitoringByTeamSlug, { teamSlug: "jo13-2" })).polling)
      .toMatchObject({ attempts: 0, maxAttempts: 1, amsterdamDate: "2026-11-02" });
  });

  it("refreshes time-derived monitoring from a bot minute without a database write", async () => {
    const t = convexTest(schema, modules);
    const before = await t.query(api.standings.getMonitoringByTeamSlug, {
      teamSlug: "jo13-2", asOf: Date.parse("2026-11-01T20:59:00Z"),
    });
    const after = await t.query(api.standings.getMonitoringByTeamSlug, {
      teamSlug: "jo13-2", asOf: Date.parse("2026-11-01T21:00:00Z"),
    });
    expect(before.polling.status).toBe("waiting");
    expect(after.polling.status).toBe("outside_window");
    expect(after.asOf).toBe(Date.parse("2026-11-01T21:00:00Z"));
    expect(after.polling.maxAttempts).toBe(44);
    await expect(t.query(api.standings.getMonitoringByTeamSlug, { teamSlug: "jo13-2", asOf: -1 }))
      .rejects.toThrow("Ongeldig controlemoment");
  });
});
