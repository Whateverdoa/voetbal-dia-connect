/**
 * Replace matchPlayers when a fixture was moved to another team.
 * Only for scheduled/lineup matches that never started.
 */
import { mutation, type MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";
import { requireAdminOrOps } from "../lib/opsAuth";
import { rosterNeedsReplace } from "./matchRosterPolicy";

export async function replaceMatchRoster(
  ctx: MutationCtx,
  args: {
    matchId: Id<"matches">;
    playerIds: Id<"players">[];
    dryRun: boolean;
  },
): Promise<{ deleted: number; inserted: number }> {
  const existing = await ctx.db
    .query("matchPlayers")
    .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
    .collect();

  if (args.dryRun) {
    return { deleted: existing.length, inserted: args.playerIds.length };
  }

  for (const row of existing) {
    await ctx.db.delete(row._id);
  }

  const now = Date.now();
  for (const playerId of args.playerIds) {
    await ctx.db.insert("matchPlayers", {
      matchId: args.matchId,
      playerId,
      isKeeper: false,
      onField: false,
      createdAt: now,
    });
  }

  return { deleted: existing.length, inserted: args.playerIds.length };
}

const repairReturns = v.object({
  dryRun: v.boolean(),
  matchesChecked: v.number(),
  repaired: v.number(),
  deletedMatchPlayers: v.number(),
  insertedMatchPlayers: v.number(),
  samples: v.array(
    v.object({
      matchId: v.id("matches"),
      teamSlug: v.string(),
      opponent: v.string(),
      deleted: v.number(),
      inserted: v.number(),
    }),
  ),
});

/**
 * Scheduled/lineup matches whose lineup belongs to another team
 * (e.g. after Sportlink remapping JO13-2JM from jo13-1 → jo13-2).
 */
export const repairMismatchedRosters = mutation({
  args: {
    dryRun: v.optional(v.boolean()),
    opsSecret: v.optional(v.string()),
  },
  returns: repairReturns,
  handler: async (ctx, args) => {
    await requireAdminOrOps(ctx, args.opsSecret);
    const dryRun = args.dryRun ?? true;

    const matches = await ctx.db.query("matches").collect();
    const players = await ctx.db.query("players").collect();
    const allMatchPlayers = await ctx.db.query("matchPlayers").collect();
    const playerById = new Map(players.map((p) => [p._id, p]));

    const rowsByMatch = new Map<Id<"matches">, typeof allMatchPlayers>();
    for (const row of allMatchPlayers) {
      const list = rowsByMatch.get(row.matchId) ?? [];
      list.push(row);
      rowsByMatch.set(row.matchId, list);
    }

    const activeByTeam = new Map<Id<"teams">, Id<"players">[]>();
    for (const player of players) {
      if (!player.active) continue;
      const list = activeByTeam.get(player.teamId) ?? [];
      list.push(player._id);
      activeByTeam.set(player.teamId, list);
    }

    let repaired = 0;
    let deletedMatchPlayers = 0;
    let insertedMatchPlayers = 0;
    const samples: Array<{
      matchId: Id<"matches">;
      teamSlug: string;
      opponent: string;
      deleted: number;
      inserted: number;
    }> = [];

    for (const match of matches) {
      if (match.status !== "scheduled" && match.status !== "lineup") continue;
      if (match.startedAt || match.finishedAt) continue;

      const rows = rowsByMatch.get(match._id) ?? [];
      if (rows.length === 0) continue;

      const playerTeamIds = rows.map(
        (row) => playerById.get(row.playerId)?.teamId,
      );
      if (!rosterNeedsReplace(match.teamId, playerTeamIds)) continue;

      const team = await ctx.db.get(match.teamId);
      const newIds = activeByTeam.get(match.teamId) ?? [];
      const result = await replaceMatchRoster(ctx, {
        matchId: match._id,
        playerIds: newIds,
        dryRun,
      });

      repaired++;
      deletedMatchPlayers += result.deleted;
      insertedMatchPlayers += result.inserted;
      if (samples.length < 20) {
        samples.push({
          matchId: match._id,
          teamSlug: team?.slug ?? "?",
          opponent: match.opponent,
          deleted: result.deleted,
          inserted: result.inserted,
        });
      }
    }

    return {
      dryRun,
      matchesChecked: matches.length,
      repaired,
      deletedMatchPlayers,
      insertedMatchPlayers,
      samples,
    };
  },
});
