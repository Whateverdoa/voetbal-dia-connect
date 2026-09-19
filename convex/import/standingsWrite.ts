/**
 * Database side of the Sportlink standings sync (actions cannot touch the db).
 */
import { v } from "convex/values";
import { internalMutation, internalQuery } from "../_generated/server";
import { standingRowValidator } from "../schemaFragments";

/** Slugs of teams we can actually show a page for. */
export const listTeamSlugs = internalQuery({
  args: {},
  returns: v.array(v.string()),
  handler: async (ctx) => {
    const teams = await ctx.db.query("teams").collect();
    return teams.map((team) => team.slug);
  },
});

/** Stable content hash (excludes fetchedAt) so polls can detect a real table change. */
export const getStandingsFingerprint = internalQuery({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const all = await ctx.db.query("standings").collect();
    const normalized = all
      .map((doc) => ({
        teamSlug: doc.teamSlug,
        poulecode: doc.poulecode,
        competitionName: doc.competitionName,
        klassepoule: doc.klassepoule,
        sportlinkTeamName: doc.sportlinkTeamName,
        rows: doc.rows,
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

function standingContentEqual(
  existing: {
    poulecode: string;
    competitionName: string;
    klassepoule: string;
    sportlinkTeamName: string;
    rows: unknown;
  },
  next: {
    poulecode: string;
    competitionName: string;
    klassepoule: string;
    sportlinkTeamName: string;
    rows: unknown;
  }
): boolean {
  return (
    existing.poulecode === next.poulecode &&
    existing.competitionName === next.competitionName &&
    existing.klassepoule === next.klassepoule &&
    existing.sportlinkTeamName === next.sportlinkTeamName &&
    JSON.stringify(existing.rows) === JSON.stringify(next.rows)
  );
}

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
      if (standingContentEqual(existing, args)) {
        await ctx.db.patch(existing._id, { fetchedAt: doc.fetchedAt });
        return "unchanged";
      }
      await ctx.db.patch(existing._id, doc);
      return "updated";
    }

    await ctx.db.insert("standings", doc);
    return "created";
  },
});

/** Drop cached standings for teams that no longer appear in a bond poule. */
export const pruneStandings = internalMutation({
  args: { keepTeamSlugs: v.array(v.string()) },
  returns: v.number(),
  handler: async (ctx, args) => {
    const keep = new Set(args.keepTeamSlugs);
    const all = await ctx.db.query("standings").collect();

    let removed = 0;
    for (const doc of all) {
      if (keep.has(doc.teamSlug)) continue;
      await ctx.db.delete(doc._id);
      removed++;
    }
    return removed;
  },
});
