/**
 * Public bond standings — unauthenticated, read from the Sportlink cache.
 */
import { v } from "convex/values";
import { query } from "./_generated/server";
import { standingRowValidator } from "./schemaFragments";
import {
  getStandingsPollWindow,
  maxStandingsPollAttemptsForDay,
  nextStandingsPollAt,
} from "./lib/standingsPolling";

export const getByTeamSlug = query({
  args: { teamSlug: v.string() },
  returns: v.union(
    v.object({
      poulecode: v.string(),
      competitionName: v.string(),
      klassepoule: v.string(),
      sportlinkTeamName: v.string(),
      rows: v.array(standingRowValidator),
      fetchedAt: v.number(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const doc = await ctx.db
      .query("standings")
      .withIndex("by_team_slug", (q) =>
        q.eq("teamSlug", args.teamSlug.toLowerCase())
      )
      .first();

    if (!doc) return null;

    return {
      poulecode: doc.poulecode,
      competitionName: doc.competitionName,
      klassepoule: doc.klassepoule,
      sportlinkTeamName: doc.sportlinkTeamName,
      rows: doc.rows,
      fetchedAt: doc.fetchedAt,
    };
  },
});

/** Public cache health only; global polling never certifies a team's results. */
export const getMonitoringByTeamSlug = query({
  // Bots should pass the current minute to refresh time-derived status even
  // when no database row changes (Convex subscriptions do not tick with time).
  args: { teamSlug: v.string(), asOf: v.optional(v.number()) },
  returns: v.object({
    asOf: v.number(),
    teamSlug: v.string(),
    hasStanding: v.boolean(),
    poulecode: v.union(v.string(), v.null()),
    lastSuccessfulFetchAt: v.union(v.number(), v.null()),
    lastContentChangedAt: v.union(v.number(), v.null()),
    polling: v.object({
      scope: v.literal("global"),
      amsterdamDate: v.union(v.string(), v.null()),
      attempts: v.number(),
      maxAttempts: v.number(),
      lastAttemptAt: v.union(v.number(), v.null()),
      lastCompletedAt: v.union(v.number(), v.null()),
      lastOutcome: v.union(
        v.literal("running"), v.literal("changed"), v.literal("unchanged"),
        v.literal("partial"), v.literal("error"), v.null(),
      ),
      status: v.union(
        v.literal("waiting"), v.literal("running"), v.literal("daily_limit"),
        v.literal("outside_window"), v.literal("timed_out"),
      ),
      nextPollAt: v.number(),
    }),
  }),
  handler: async (ctx, { teamSlug, asOf }) => {
    const now = asOf ?? Date.now();
    if (!Number.isFinite(now) || now < 0 || now > 8_640_000_000_000_000 - 8 * 86_400_000) {
      throw new Error("Ongeldig controlemoment");
    }
    const normalizedSlug = teamSlug.trim().toLowerCase();
    const [standing, poll] = await Promise.all([
      ctx.db.query("standings")
        .withIndex("by_team_slug", (q) => q.eq("teamSlug", normalizedSlug))
        .first(),
      ctx.db.query("standingsPollState")
        .withIndex("by_key", (q) => q.eq("key", "weekend"))
        .unique(),
    ]);
    const window = getStandingsPollWindow(now);
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Amsterdam", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date(now));
    const attempts = poll?.amsterdamDate === today ? poll.attempts ?? 0 : 0;
    const activeLease = poll?.lastOutcome === "running" && (poll.leaseUntil ?? 0) > now;
    const timedOut = poll?.lastOutcome === "running" && !activeLease;
    const status = activeLease ? "running" as const
      : !window ? "outside_window" as const
      : attempts >= window.maxAttempts ? "daily_limit" as const
      : timedOut ? "timed_out" as const
      : "waiting" as const;
    // Once a budget is exhausted, skip any remaining slots of that local day.
    let nextPollAt = nextStandingsPollAt(now);
    if (window && attempts >= window.maxAttempts) {
      while (getStandingsPollWindow(nextPollAt)?.amsterdamDate === today) {
        nextPollAt = nextStandingsPollAt(nextPollAt);
      }
    }
    return {
      asOf: now,
      teamSlug: normalizedSlug,
      hasStanding: standing !== null,
      poulecode: standing?.poulecode ?? null,
      lastSuccessfulFetchAt: standing?.fetchedAt ?? null,
      lastContentChangedAt: standing?.lastContentChangedAt ?? null,
      polling: {
        scope: "global" as const,
        amsterdamDate: today,
        attempts,
        maxAttempts: maxStandingsPollAttemptsForDay(now),
        lastAttemptAt: poll?.lastAttemptAt ?? null,
        lastCompletedAt: poll?.lastCompletedAt ?? null,
        lastOutcome: poll?.lastOutcome ?? null,
        status,
        nextPollAt,
      },
    };
  },
});
