/**
 * Database side of the Sportlink standings sync (actions cannot touch the db).
 */
import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { standingRowValidator, standingsPollOutcomeValidator } from "../schemaFragments";
import {
  getStandingsPollWindow,
  MAX_STANDINGS_TEAMS,
  STANDINGS_POLL_LEASE_MS,
  standingContentFingerprint,
} from "../lib/standingsPolling";

/** Slugs of teams we can actually show a page for. */
export const listTeamSlugs = internalQuery({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const teams = await ctx.db.query("teams").withIndex("by_slug_only")
      .take(MAX_STANDINGS_TEAMS + 1);
    if (teams.length > MAX_STANDINGS_TEAMS) {
      throw new Error("Te veel teams voor één standencontrole");
    }
    return teams.map((team) => team.slug);
  },
});

/** Stable contents exclude timestamps, logo URLs and source row ordering. */
export const getStandingsFingerprint = internalQuery({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const all = await ctx.db.query("standings").withIndex("by_team_slug")
      .take(MAX_STANDINGS_TEAMS + 1);
    if (all.length > MAX_STANDINGS_TEAMS) {
      throw new Error("Te veel standen voor één controle");
    }
    const normalized = all
      .map((doc) => ({
        teamSlug: doc.teamSlug,
        content: standingContentFingerprint(doc),
      }))
      .sort((a, b) => a.teamSlug.localeCompare(b.teamSlug));
    return JSON.stringify(normalized);
  },
});

export const getWeekendPollState = internalQuery({
  args: {},
  returns: v.union(
    v.null(),
    v.object({
      amsterdamDate: v.string(),
      baselineFingerprint: v.string(),
      sawUpdate: v.boolean(),
      updatedAt: v.number(),
      attempts: v.optional(v.number()),
      lastSlot: v.optional(v.number()),
      lastAttemptAt: v.optional(v.number()),
      leaseUntil: v.optional(v.number()),
      lastOutcome: v.optional(standingsPollOutcomeValidator),
      lastCompletedAt: v.optional(v.number()),
      lastSuccessfulPollAt: v.optional(v.number()),
      failedPouleCount: v.optional(v.number()),
    })
  ),
  handler: async (ctx) => {
    const row = await ctx.db
      .query("standingsPollState")
      .withIndex("by_key", (q) => q.eq("key", "weekend"))
      .unique();
    if (!row) return null;
    return {
      amsterdamDate: row.amsterdamDate,
      baselineFingerprint: row.baselineFingerprint,
      sawUpdate: row.sawUpdate,
      updatedAt: row.updatedAt,
      attempts: row.attempts,
      lastSlot: row.lastSlot,
      lastAttemptAt: row.lastAttemptAt,
      leaseUntil: row.leaseUntil,
      lastOutcome: row.lastOutcome,
      lastCompletedAt: row.lastCompletedAt,
      lastSuccessfulPollAt: row.lastSuccessfulPollAt,
      failedPouleCount: row.failedPouleCount,
    };
  },
});

export const saveWeekendPollState = internalMutation({
  args: {
    amsterdamDate: v.string(),
    baselineFingerprint: v.string(),
    sawUpdate: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("standingsPollState")
      .withIndex("by_key", (q) => q.eq("key", "weekend"))
      .unique();
    const patch = {
      amsterdamDate: args.amsterdamDate,
      baselineFingerprint: args.baselineFingerprint,
      sawUpdate: args.sawUpdate,
      updatedAt: Date.now(),
    };
    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("standingsPollState", { key: "weekend", ...patch });
    }
    return null;
  },
});

/** Reserve the attempt atomically before an action performs any network work. */
export const reserveStandingsPoll = internalMutation({
  args: {},
  returns: v.union(
    v.object({
      allowed: v.literal(false),
      reason: v.union(
        v.literal("outside_window"),
        v.literal("already_attempted"),
        v.literal("daily_limit"),
        v.literal("in_progress")
      ),
    }),
    v.object({
      allowed: v.literal(true),
      amsterdamDate: v.string(),
      slot: v.number(),
      attempt: v.number(),
    })
  ),
  handler: async (ctx) => {
    const now = Date.now();
    const window = getStandingsPollWindow(now);
    if (!window) return { allowed: false as const, reason: "outside_window" as const };
    const existing = await ctx.db.query("standingsPollState")
      .withIndex("by_key", (q) => q.eq("key", "weekend")).unique();
    if (existing?.lastSlot === window.slot) {
      return { allowed: false as const, reason: "already_attempted" as const };
    }
    if (existing?.lastOutcome === "running" && (existing.leaseUntil ?? 0) > now) {
      return { allowed: false as const, reason: "in_progress" as const };
    }
    const sameDay = existing?.amsterdamDate === window.amsterdamDate;
    const attempts = sameDay ? existing.attempts ?? 0 : 0;
    if (attempts >= window.maxAttempts) {
      return { allowed: false as const, reason: "daily_limit" as const };
    }
    const patch = {
      amsterdamDate: window.amsterdamDate,
      baselineFingerprint: sameDay ? existing.baselineFingerprint : "",
      sawUpdate: sameDay ? existing.sawUpdate : false,
      updatedAt: now,
      attempts: attempts + 1,
      lastSlot: window.slot,
      lastAttemptAt: now,
      leaseUntil: now + STANDINGS_POLL_LEASE_MS,
      lastOutcome: "running" as const,
      failedPouleCount: 0,
    };
    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("standingsPollState", { key: "weekend", ...patch });
    }
    return {
      allowed: true as const,
      amsterdamDate: window.amsterdamDate,
      slot: window.slot,
      attempt: attempts + 1,
    };
  },
});

/** Ignore completion from an expired, replaced or already-completed claim. */
export const completeStandingsPoll = internalMutation({
  args: {
    slot: v.number(),
    outcome: v.union(
      v.literal("changed"),
      v.literal("unchanged"),
      v.literal("partial"),
      v.literal("error")
    ),
    contentChanged: v.boolean(),
    failedPouleCount: v.number(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db.query("standingsPollState")
      .withIndex("by_key", (q) => q.eq("key", "weekend")).unique();
    if (!existing || existing.lastSlot !== args.slot ||
      existing.lastOutcome !== "running" || (existing.leaseUntil ?? 0) <= now) {
      return false;
    }
    if (!Number.isInteger(args.failedPouleCount) || args.failedPouleCount < 0) {
      throw new Error("Ongeldig aantal mislukte poules");
    }
    const successful = (args.outcome === "changed" || args.outcome === "unchanged") &&
      args.failedPouleCount === 0;
    await ctx.db.patch(existing._id, {
      sawUpdate: existing.sawUpdate || args.contentChanged,
      lastOutcome: args.outcome,
      lastCompletedAt: now,
      ...(successful ? { lastSuccessfulPollAt: now } : {}),
      failedPouleCount: args.failedPouleCount,
      leaseUntil: undefined,
      updatedAt: now,
    });
    return true;
  },
});

export const upsertStanding = internalMutation({
  args: {
    teamSlug: v.string(),
    poulecode: v.string(),
    competitionName: v.string(),
    klassepoule: v.string(),
    sportlinkTeamName: v.string(),
    rows: v.array(standingRowValidator),
  },
  returns: v.union(
    v.literal("created"),
    v.literal("updated"),
    v.literal("unchanged")
  ),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("standings")
      .withIndex("by_team_slug", (q) => q.eq("teamSlug", args.teamSlug))
      .first();

    const doc = { ...args, fetchedAt: Date.now() };

    if (existing) {
      if (standingContentFingerprint(existing) === standingContentFingerprint(args)) {
        // Refresh signed URLs even when no sports data changed. Do not invent a
        // historical change time for legacy rows that lack one.
        await ctx.db.patch(existing._id, doc);
        return "unchanged";
      }
      await ctx.db.patch(existing._id, { ...doc, lastContentChangedAt: doc.fetchedAt });
      return "updated";
    }

    await ctx.db.insert("standings", { ...doc, lastContentChangedAt: doc.fetchedAt });
    return "created";
  },
});

/** Drop cached standings for teams that no longer appear in a bond poule. */
export const pruneStandings = internalMutation({
  args: { keepTeamSlugs: v.array(v.string()) },
  returns: v.number(),
  handler: async (ctx, args) => {
    const keep = new Set(args.keepTeamSlugs);
    const all = await ctx.db.query("standings").withIndex("by_team_slug")
      .take(MAX_STANDINGS_TEAMS + 1);
    if (all.length > MAX_STANDINGS_TEAMS) {
      throw new Error("Te veel standen voor één opschoonactie");
    }

    let removed = 0;
    for (const doc of all) {
      if (keep.has(doc.teamSlug)) continue;
      await ctx.db.delete(doc._id);
      removed++;
    }
    return removed;
  },
});
