// @vitest-environment node
import { defineTestApp } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import schema from "../schema";
import * as standingsWrite from "./standingsWrite";
import type { StandingRow } from "./sportlinkStandingsMapper";
import { STANDINGS_POLL_INTERVAL_MS, STANDINGS_POLL_LEASE_MS } from "../lib/standingsPolling";

const app = defineTestApp({ schema }).defineModules({
  "import/standingsWrite": standingsWrite,
});
const api = app.internal.import.standingsWrite;
const saturday = Date.parse("2026-10-31T10:00:00Z");
const slot = Math.floor(saturday / STANDINGS_POLL_INTERVAL_MS);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(saturday);
});
afterEach(() => vi.useRealTimers());

describe("atomic standings poll claims", () => {
  it("does not create a claim outside scheduled windows", async () => {
    const t = app.createTest();
    vi.setSystemTime(Date.parse("2026-10-30T10:00:00Z"));
    expect(await t.mutation(api.reserveStandingsPoll, {})).toEqual({
      allowed: false, reason: "outside_window",
    });
    expect(await t.query(api.getWeekendPollState, {})).toBeNull();
  });

  it("allows only one simultaneous claim for a slot and charges it before fetch", async () => {
    const t = app.createTest();
    const claims = await Promise.all(Array.from({ length: 3 }, () =>
      t.mutation(api.reserveStandingsPoll, {}),
    ));
    expect(claims.filter((claim) => claim.allowed)).toHaveLength(1);
    expect(claims.filter((claim) => !claim.allowed)).toEqual([
      { allowed: false, reason: "already_attempted" },
      { allowed: false, reason: "already_attempted" },
    ]);
    expect(await t.query(api.getWeekendPollState, {})).toMatchObject({
      attempts: 1, lastSlot: slot, lastOutcome: "running",
      leaseUntil: saturday + STANDINGS_POLL_LEASE_MS,
    });
  });

  it("keeps polling later slots after a real change", async () => {
    const t = app.createTest();
    await t.mutation(api.reserveStandingsPoll, {});
    expect(await t.mutation(api.completeStandingsPoll, {
      slot, outcome: "changed", contentChanged: true, failedPouleCount: 0,
    })).toBe(true);
    vi.setSystemTime(saturday + STANDINGS_POLL_INTERVAL_MS);
    expect(await t.mutation(api.reserveStandingsPoll, {})).toMatchObject({
      allowed: true, slot: slot + 1, attempt: 2,
    });
    expect(await t.query(api.getWeekendPollState, {})).toMatchObject({
      sawUpdate: true, lastSuccessfulPollAt: saturday,
    });
  });

  it("counts a failed attempt and never retries the same slot", async () => {
    const t = app.createTest();
    await t.mutation(api.reserveStandingsPoll, {});
    await t.mutation(api.completeStandingsPoll, {
      slot, outcome: "error", contentChanged: false, failedPouleCount: 1,
    });
    vi.setSystemTime(saturday + 60_000);
    expect(await t.mutation(api.reserveStandingsPoll, {})).toEqual({
      allowed: false, reason: "already_attempted",
    });
    expect(await t.query(api.getWeekendPollState, {})).toMatchObject({
      attempts: 1, lastOutcome: "error", failedPouleCount: 1,
    });
    expect((await t.query(api.getWeekendPollState, {}))?.lastSuccessfulPollAt).toBeUndefined();
  });

  it("enforces the daily limit even for a previously unclaimed slot", async () => {
    const t = app.createTest();
    await t.run(async (ctx) => {
      await ctx.db.insert("standingsPollState", {
        key: "weekend", amsterdamDate: "2026-10-31", baselineFingerprint: "",
        sawUpdate: true, updatedAt: saturday, attempts: 44, lastSlot: slot - 1,
      });
    });
    expect(await t.mutation(api.reserveStandingsPoll, {})).toEqual({
      allowed: false, reason: "daily_limit",
    });
  });

  it("resets the date budget while preserving the last successful check", async () => {
    const t = app.createTest();
    await t.run(async (ctx) => {
      await ctx.db.insert("standingsPollState", {
        key: "weekend", amsterdamDate: "2026-10-31", baselineFingerprint: "old",
        sawUpdate: true, updatedAt: saturday, attempts: 44, lastSlot: slot + 43,
        lastSuccessfulPollAt: saturday, lastOutcome: "unchanged",
      });
    });
    vi.setSystemTime(Date.parse("2026-11-01T10:00:00Z"));
    expect(await t.mutation(api.reserveStandingsPoll, {})).toMatchObject({
      allowed: true, amsterdamDate: "2026-11-01", attempt: 1,
    });
    expect(await t.query(api.getWeekendPollState, {})).toMatchObject({
      attempts: 1, baselineFingerprint: "", sawUpdate: false,
      lastSuccessfulPollAt: saturday,
    });
  });

  it("accepts a legacy sawUpdate flag without suppressing the new schedule", async () => {
    const t = app.createTest();
    await t.mutation(api.saveWeekendPollState, {
      amsterdamDate: "2026-10-31", baselineFingerprint: "legacy", sawUpdate: true,
    });
    expect(await t.mutation(api.reserveStandingsPoll, {})).toMatchObject({
      allowed: true, attempt: 1,
    });
  });

  it("prevents overlap across slot boundaries and ignores old completion", async () => {
    const t = app.createTest();
    vi.setSystemTime(saturday + 14 * 60_000);
    await t.mutation(api.reserveStandingsPoll, {});
    vi.setSystemTime(saturday + 15 * 60_000);
    expect(await t.mutation(api.reserveStandingsPoll, {})).toEqual({
      allowed: false, reason: "in_progress",
    });
    vi.setSystemTime(saturday + 24 * 60_000);
    expect(await t.mutation(api.reserveStandingsPoll, {})).toMatchObject({
      allowed: true, slot: slot + 1, attempt: 2,
    });
    expect(await t.mutation(api.completeStandingsPoll, {
      slot, outcome: "changed", contentChanged: true, failedPouleCount: 0,
    })).toBe(false);
    expect(await t.query(api.getWeekendPollState, {})).toMatchObject({
      lastSlot: slot + 1, lastOutcome: "running", sawUpdate: false,
    });
  });

  it("does not reuse an expired claim or complete it after its lease", async () => {
    const t = app.createTest();
    await t.mutation(api.reserveStandingsPoll, {});
    vi.setSystemTime(saturday + STANDINGS_POLL_LEASE_MS);
    expect(await t.mutation(api.reserveStandingsPoll, {})).toEqual({
      allowed: false, reason: "already_attempted",
    });
    expect(await t.mutation(api.completeStandingsPoll, {
      slot, outcome: "unchanged", contentChanged: false, failedPouleCount: 0,
    })).toBe(false);
  });

  it("preserves the last full success after partial failure and completes only once", async () => {
    const t = app.createTest();
    await t.mutation(api.reserveStandingsPoll, {});
    await t.mutation(api.completeStandingsPoll, {
      slot, outcome: "unchanged", contentChanged: false, failedPouleCount: 0,
    });
    vi.setSystemTime(saturday + STANDINGS_POLL_INTERVAL_MS);
    await t.mutation(api.reserveStandingsPoll, {});
    const partial = { slot: slot + 1, outcome: "partial" as const,
      contentChanged: true, failedPouleCount: 2 };
    expect(await t.mutation(api.completeStandingsPoll, partial)).toBe(true);
    expect(await t.mutation(api.completeStandingsPoll, partial)).toBe(false);
    expect(await t.query(api.getWeekendPollState, {})).toMatchObject({
      lastOutcome: "partial", failedPouleCount: 2, sawUpdate: true,
      lastSuccessfulPollAt: saturday,
      lastCompletedAt: saturday + STANDINGS_POLL_INTERVAL_MS,
    });
  });
});

const ownRow: StandingRow = {
  teamName: "DIA O13-2JM", position: 1, played: 1, won: 1, drawn: 0, lost: 0,
  goalsFor: 3, goalsAgainst: 0, goalDifference: 3, points: 3, isOwnClub: true,
  clubLogoUrl: "https://example.test/logo?token=old",
};
const standing = {
  teamSlug: "jo13-2", poulecode: "123", competitionName: "Onder 13",
  klassepoule: "2e klasse 01", sportlinkTeamName: ownRow.teamName,
  rows: [ownRow, { ...ownRow, teamName: "Tegenstander", position: 2, isOwnClub: false }],
};

describe("observed standings changes", () => {
  it("records initial observation and keeps signed logos fresh without a false change", async () => {
    const t = app.createTest();
    expect(await t.mutation(api.upsertStanding, standing)).toBe("created");
    const before = await t.query(api.getStandingsFingerprint, {});
    vi.setSystemTime(saturday + STANDINGS_POLL_INTERVAL_MS);
    const refreshed = {
      ...standing,
      rows: [...standing.rows].reverse().map((row) => ({
        ...row, clubLogoUrl: "https://example.test/logo?token=new",
      })),
    };
    expect(await t.mutation(api.upsertStanding, refreshed)).toBe("unchanged");
    expect(await t.query(api.getStandingsFingerprint, {})).toBe(before);
    const saved = await t.run((ctx) => ctx.db.query("standings")
      .withIndex("by_team_slug", (q) => q.eq("teamSlug", standing.teamSlug)).unique());
    expect(saved).toMatchObject({
      fetchedAt: saturday + STANDINGS_POLL_INTERVAL_MS, lastContentChangedAt: saturday,
      rows: refreshed.rows,
    });
  });

  it("advances the observation time for sporting changes and phase changes", async () => {
    const t = app.createTest();
    await t.mutation(api.upsertStanding, standing);
    const first = await t.query(api.getStandingsFingerprint, {});
    vi.setSystemTime(saturday + STANDINGS_POLL_INTERVAL_MS);
    expect(await t.mutation(api.upsertStanding, {
      ...standing, rows: [{ ...ownRow, played: 2, won: 2, points: 6 }],
    })).toBe("updated");
    expect(await t.query(api.getStandingsFingerprint, {})).not.toBe(first);
    vi.setSystemTime(saturday + 2 * STANDINGS_POLL_INTERVAL_MS);
    expect(await t.mutation(api.upsertStanding, {
      ...standing, poulecode: "456", rows: [{ ...ownRow, played: 0, won: 0, points: 0 }],
    })).toBe("updated");
    const saved = await t.run((ctx) => ctx.db.query("standings")
      .withIndex("by_team_slug", (q) => q.eq("teamSlug", standing.teamSlug)).unique());
    expect(saved?.lastContentChangedAt).toBe(saturday + 2 * STANDINGS_POLL_INTERVAL_MS);
  });

  it("does not invent a change date for an unchanged legacy standing", async () => {
    const t = app.createTest();
    await t.run(async (ctx) => {
      await ctx.db.insert("standings", { ...standing, fetchedAt: saturday - 86_400_000 });
    });
    expect(await t.mutation(api.upsertStanding, standing)).toBe("unchanged");
    const saved = await t.run((ctx) => ctx.db.query("standings")
      .withIndex("by_team_slug", (q) => q.eq("teamSlug", standing.teamSlug)).unique());
    expect(saved?.fetchedAt).toBe(saturday);
    expect(saved?.lastContentChangedAt).toBeUndefined();
  });
});
