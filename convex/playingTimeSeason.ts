/**
 * Coach-facing season playing-time totals per team.
 */
import { query } from "./_generated/server";
import { v } from "convex/values";
import { getCurrentUserAccess, requireCoachForTeam } from "./lib/userAccess";
import { hasAdminRole } from "./lib/adminOverride";
import { isActiveSeasonMatch } from "./lib/season";
import { aggregateSeasonPlayingTime } from "./lib/seasonPlayingTime";

export const getTeamSeasonPlayingTime = query({
  args: {
    teamId: v.id("teams"),
    seasonKey: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      seasonKey: v.string(),
      players: v.array(
        v.object({
          playerId: v.id("players"),
          name: v.string(),
          number: v.union(v.number(), v.null()),
          matchesPlayed: v.number(),
          totalMinutes: v.number(),
        })
      ),
    })
  ),
  handler: async (ctx, args) => {
    try {
      const access = await getCurrentUserAccess(ctx);
      if (!hasAdminRole(access)) {
        await requireCoachForTeam(ctx, args.teamId);
      }
    } catch {
      return null;
    }

    const team = await ctx.db.get(args.teamId);
    if (!team) return null;

    const players = await ctx.db
      .query("players")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    const matches = await ctx.db
      .query("matches")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    const finished = matches.filter(
      (match) =>
        match.status === "finished" &&
        isActiveSeasonMatch(match, args.seasonKey)
    );

    const rows: { playerId: string; minutesPlayed: number }[] = [];
    for (const match of finished) {
      const matchPlayers = await ctx.db
        .query("matchPlayers")
        .withIndex("by_match", (q) => q.eq("matchId", match._id))
        .collect();
      for (const mp of matchPlayers) {
        rows.push({
          playerId: String(mp.playerId),
          minutesPlayed: mp.minutesPlayed ?? 0,
        });
      }
    }

    const totals = aggregateSeasonPlayingTime(
      players.map((player) => ({
        playerId: String(player._id),
        name: player.name,
        number: player.number ?? null,
        active: player.active !== false,
      })),
      rows
    );

    return {
      seasonKey: args.seasonKey,
      players: totals.map((row) => ({
        playerId: row.playerId as typeof players[number]["_id"],
        name: row.name,
        number: row.number,
        matchesPlayed: row.matchesPlayed,
        totalMinutes: row.totalMinutes,
      })),
    };
  },
});
