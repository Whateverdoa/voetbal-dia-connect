/**
 * Weekend uitslagen-pipeline: gate op “eerste wedstrijd vandaag is afgelopen”, dan fetch + sync.
 */
import { action, internalAction, internalQuery } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";
import { hasValidOpsSecret } from "../lib/opsAuth";
import { parseAmsterdamTimestamp } from "../lib/timezone";
import type { VoetbalAssistImportSummary } from "./resultsFetch";

/** Return shape of `syncWedstrijdenToMatches.syncAllInternal`. */
type SyncWedstrijdenSummary = {
  totalWedstrijden: number;
  dryRun: boolean;
  created: number;
  createdMatchPlayers: number;
  backfilledMatchRosters: number;
  updatedFinished: number;
  skippedExisting: number;
  skippedExistingWithResult: number;
  skippedNoDiaTeam: number;
  skippedUnknownTeam: number;
  skippedCancelled: number;
  skippedNoDate: number;
};

type WeeklyCronResult =
  | { skipped: "no_matches_ended_yet" }
  | {
      skipped: null;
      fetchResult: VoetbalAssistImportSummary;
      syncResult: SyncWedstrijdenSummary;
    };

function amsterdamDayBoundsFromNow(nowMs: number): { dayStart: number; dayEnd: number } {
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(nowMs));

  const dayStart = parseAmsterdamTimestamp(`${dateStr}T00:00:00`);
  let dayEnd = parseAmsterdamTimestamp(`${dateStr}T23:59:59.999`);
  if (!Number.isFinite(dayEnd) || Number.isNaN(dayEnd)) {
    dayEnd = dayStart + 24 * 60 * 60 * 1000 - 1;
  }
  return { dayStart, dayEnd };
}

export const assertIsAdmin = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const access = await ctx.db
      .query("userAccess")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();
    if (!access?.active || !access.roles.includes("admin")) {
      throw new Error("Admin-toegang vereist");
    }
    return { ok: true as const };
  },
});

export const anyMatchEndedOnAmsterdamDay = internalQuery({
  args: {
    dayStart: v.number(),
    dayEnd: v.number(),
    now: v.number(),
  },
  handler: async (ctx, { dayStart, dayEnd, now }) => {
    const matches = await ctx.db.query("matches").collect();
    for (const m of matches) {
      if (m.scheduledAt === undefined || !Number.isFinite(m.scheduledAt)) continue;
      if (m.scheduledAt < dayStart || m.scheduledAt > dayEnd) continue;
      const durationMin = m.regulationDurationMinutes ?? 60;
      const endMs = m.scheduledAt + durationMin * 60_000 + 15 * 60_000;
      if (endMs <= now) return true;
    }
    return false;
  },
});

export const runIfMatchesEnded = internalAction({
  args: {},
  handler: async (ctx): Promise<WeeklyCronResult> => {
    const now = Date.now();
    const { dayStart, dayEnd } = amsterdamDayBoundsFromNow(now);
    const shouldRun = await ctx.runQuery(
      internal.import.weeklyUpdate.anyMatchEndedOnAmsterdamDay,
      { dayStart, dayEnd, now },
    );
    if (!shouldRun) {
      console.log("[weeklyUpdate] skipped: no matches ended yet");
      return { skipped: "no_matches_ended_yet" };
    }
    const fetchResult: VoetbalAssistImportSummary = await ctx.runAction(
      internal.import.resultsFetch.fetchLatestResults,
      {},
    );
    const syncResult: SyncWedstrijdenSummary = await ctx.runMutation(
      internal.import.syncWedstrijdenToMatches.syncAllInternal,
      { dryRun: false },
    );
    console.log(
      `[weeklyUpdate] ran ranAt=${now} created=${syncResult.created} updatedFinished=${syncResult.updatedFinished} skippedExistingWithResult=${syncResult.skippedExistingWithResult} skippedUnknownTeam=${syncResult.skippedUnknownTeam} fetchMapped=${fetchResult.totalMapped}`,
    );
    return { skipped: null, fetchResult, syncResult };
  },
});

export const runNow = action({
  args: { opsSecret: v.optional(v.string()) },
  handler: async (
    ctx,
    args,
  ): Promise<{ fetchResult: VoetbalAssistImportSummary; syncResult: SyncWedstrijdenSummary }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (identity?.email) {
      await ctx.runQuery(internal.import.weeklyUpdate.assertIsAdmin, {
        email: identity.email,
      });
    } else if (!hasValidOpsSecret(args.opsSecret)) {
      throw new Error(
        "Niet geautoriseerd: admin-sessie of geldige opsSecret vereist (CLI: JSON-args met opsSecret).",
      );
    }
    const fetchResult: VoetbalAssistImportSummary = await ctx.runAction(
      internal.import.resultsFetch.fetchLatestResults,
      {},
    );
    const syncResult: SyncWedstrijdenSummary = await ctx.runMutation(
      internal.import.syncWedstrijdenToMatches.syncAllInternal,
      { dryRun: false },
    );
    return { fetchResult, syncResult };
  },
});
