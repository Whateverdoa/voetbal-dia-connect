/**
 * Public bond standings — unauthenticated, read from the Sportlink cache.
 */
import { v } from "convex/values";
import { query } from "./_generated/server";
import { standingRowValidator } from "./schemaFragments";

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
