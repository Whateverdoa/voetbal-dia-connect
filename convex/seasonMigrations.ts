/**
 * Phase 0 clean-start migrations: season backfill, guest deactivation, Sportlink scaffolding.
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdminAccess } from "./adminAuth";
import { seasonKeyFromMs } from "./lib/season";

/** Backfill seasonKey on matches from scheduledAt or createdAt. */
export const backfillSeasonKeys = mutation({
  args: { dryRun: v.optional(v.boolean()) },
  returns: v.object({
    dryRun: v.boolean(),
    updated: v.number(),
    skipped: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    const dryRun = args.dryRun ?? true;
    const matches = await ctx.db.query("matches").collect();
    let updated = 0;
    let skipped = 0;

    for (const match of matches) {
      if (match.seasonKey) {
        skipped++;
        continue;
      }
      const base = match.scheduledAt ?? match.createdAt;
      updated++;
      if (!dryRun) {
        await ctx.db.patch(match._id, { seasonKey: seasonKeyFromMs(base) });
      }
    }

    return { dryRun, updated, skipped };
  },
});

/**
 * Deactivate guest / one-off players who appeared in fewer than minMatches
 * finished matches (default 2). Keeps weekly core roster active.
 */
export const deactivateInfrequentPlayers = mutation({
  args: {
    teamId: v.optional(v.id("teams")),
    minMatches: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  returns: v.object({
    dryRun: v.boolean(),
    deactivated: v.number(),
    examined: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    const dryRun = args.dryRun ?? true;
    const minMatches = args.minMatches ?? 2;

    const players = args.teamId
      ? await ctx.db
          .query("players")
          .withIndex("by_team", (q) => q.eq("teamId", args.teamId!))
          .collect()
      : await ctx.db.query("players").collect();

    let deactivated = 0;
    let examined = 0;

    for (const player of players) {
      if (!player.active) continue;
      examined++;

      const appearances = await ctx.db
        .query("matchPlayers")
        .withIndex("by_player", (q) => q.eq("playerId", player._id))
        .collect();

      let finishedCount = 0;
      for (const mp of appearances) {
        const match = await ctx.db.get(mp.matchId);
        if (match?.status === "finished") finishedCount++;
      }

      if (finishedCount > 0 && finishedCount < minMatches) {
        deactivated++;
        if (!dryRun) {
          await ctx.db.patch(player._id, { active: false });
        }
      }
    }

    return { dryRun, deactivated, examined };
  },
});

/** Mark JO13-1 and JO13-2 as selection teams for the pilot. */
export const markJo13SelectionTeams = mutation({
  args: { dryRun: v.optional(v.boolean()) },
  returns: v.object({
    dryRun: v.boolean(),
    updated: v.array(v.string()),
    missing: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    const dryRun = args.dryRun ?? true;
    const slugs = ["jo13-1", "jo13-2"];
    const updated: string[] = [];
    const missing: string[] = [];

    for (const slug of slugs) {
      const team = await ctx.db
        .query("teams")
        .withIndex("by_slug_only", (q) => q.eq("slug", slug))
        .first();
      if (!team) {
        missing.push(slug);
        continue;
      }
      updated.push(slug);
      if (!dryRun) {
        await ctx.db.patch(team._id, { isSelectionTeam: true });
      }
    }

    return { dryRun, updated, missing };
  },
});
