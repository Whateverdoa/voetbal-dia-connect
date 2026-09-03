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

export const upsertStanding = internalMutation({
  args: {
    teamSlug: v.string(),
    poulecode: v.string(),
    competitionName: v.string(),
    klassepoule: v.string(),
    sportlinkTeamName: v.string(),
    rows: v.array(standingRowValidator),
  },
  returns: v.union(v.literal("created"), v.literal("updated")),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("standings")
      .withIndex("by_team_slug", (q) => q.eq("teamSlug", args.teamSlug))
      .first();

    const doc = { ...args, fetchedAt: Date.now() };

    if (existing) {
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
