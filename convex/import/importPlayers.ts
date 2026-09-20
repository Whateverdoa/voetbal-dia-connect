/**
 * Import players from parsed CSV data.
 * Upserts players per team with duplicate detection (name-based).
 *
 * Usage via CLI: npx convex run "import/importPlayers:upsertTeamPlayers" '{ ... }'
 */
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAdminOrOps } from "../lib/opsAuth";
import { isFrozenJo132Slug } from "../lib/protectedTeams";

const upsertResult = v.object({
  error: v.optional(v.string()),
  teamSlug: v.optional(v.string()),
  teamName: v.optional(v.string()),
  dryRun: v.optional(v.boolean()),
  created: v.number(),
  skipped: v.number(),
  deactivated: v.optional(v.number()),
  skippedNames: v.optional(v.array(v.string())),
  createdNames: v.optional(v.array(v.string())),
  deactivatedNames: v.optional(v.array(v.string())),
});

export const upsertTeamPlayers = mutation({
  args: {
    opsSecret: v.optional(v.string()),
    teamSlug: v.string(),
    players: v.array(
      v.object({
        name: v.string(),
        number: v.optional(v.number()),
      }),
    ),
    dryRun: v.boolean(),
    deactivateMissing: v.optional(v.boolean()),
  },
  returns: upsertResult,
  handler: async (ctx, args) => {
    await requireAdminOrOps(ctx, args.opsSecret);

    if (isFrozenJo132Slug(args.teamSlug)) {
      return {
        error: "JO13-2 is bevroren en wordt niet gewijzigd",
        created: 0,
        skipped: 0,
      };
    }

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

    const nameKey = (value: string) => value.toLowerCase().trim().replace(/\s+/g, " ");
    const existingByName = new Map(
      existing.map((player) => [nameKey(player.name), player]),
    );
    const incomingNames = new Set(args.players.map((player) => nameKey(player.name)));

    const toCreate = args.players.filter(
      (player) => !existingByName.has(nameKey(player.name)),
    );
    const toSkip = args.players.filter((player) =>
      existingByName.has(nameKey(player.name)),
    );
    const toReactivate = existing.filter(
      (player) =>
        !player.active && incomingNames.has(nameKey(player.name)),
    );
    const toDeactivate = args.deactivateMissing
      ? existing.filter(
          (player) => player.active && !incomingNames.has(nameKey(player.name)),
        )
      : [];

    if (!args.dryRun) {
      const now = Date.now();
      for (const player of toCreate) {
        await ctx.db.insert("players", {
          teamId: team._id,
          name: player.name,
          number: player.number,
          active: true,
          createdAt: now,
        });
      }
      for (const player of toReactivate) {
        await ctx.db.patch(player._id, { active: true });
      }
      for (const player of toDeactivate) {
        await ctx.db.patch(player._id, { active: false });
      }
    }

    return {
      teamSlug: args.teamSlug,
      teamName: team.name,
      dryRun: args.dryRun,
      created: toCreate.length,
      skipped: toSkip.length,
      deactivated: toDeactivate.length,
      skippedNames: toSkip.map((player) => player.name),
      createdNames: toCreate.map((player) => player.name),
      deactivatedNames: toDeactivate.map((player) => player.name),
    };
  },
});
