/**
 * Import players from parsed CSV data.
 * Upserts players per team with duplicate detection (name-based).
 *
 * Usage via CLI: npx convex run "import/importPlayers:upsertTeamPlayers" '{ ... }'
 */
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { verifyAdminPin } from "../adminAuth";

export const upsertTeamPlayers = mutation({
  args: {
    adminPin: v.string(),
    teamSlug: v.string(),
    players: v.array(
      v.object({
        name: v.string(),
        number: v.optional(v.number()),
      }),
    ),
    dryRun: v.boolean(),
  },
  handler: async (ctx, args) => {
    verifyAdminPin(args.adminPin);

    const team = await ctx.db
      .query("teams")
      .withIndex("by_slug_only", (q) => q.eq("slug", args.teamSlug))
      .unique();

    if (!team) {
      return {
        error: `Team '${args.teamSlug}' niet gevonden`,
        created: 0,
        skipped: 0,
      };
    }

    const existing = await ctx.db
      .query("players")
      .withIndex("by_team", (q) => q.eq("teamId", team._id))
      .collect();

    const existingNames = new Set(
      existing.map((p) => p.name.toLowerCase().trim()),
    );

    const toCreate = args.players.filter(
      (p) => !existingNames.has(p.name.toLowerCase().trim()),
    );
    const toSkip = args.players.filter((p) =>
      existingNames.has(p.name.toLowerCase().trim()),
    );

    if (!args.dryRun) {
      const now = Date.now();
      for (const p of toCreate) {
        await ctx.db.insert("players", {
          teamId: team._id,
          name: p.name,
          number: p.number,
          active: true,
          createdAt: now,
        });
      }
    }

    return {
      teamSlug: args.teamSlug,
      teamName: team.name,
      dryRun: args.dryRun,
      created: toCreate.length,
      skipped: toSkip.length,
      skippedNames: toSkip.map((p) => p.name),
      createdNames: toCreate.map((p) => p.name),
    };
  },
});
