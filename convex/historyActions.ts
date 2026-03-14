import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { verifyCoachTeamByTeamId, verifyCoachTeamMembership } from "./pinHelpers";

export const canEditTeamHistory = query({
  args: {
    teamId: v.id("teams"),
  },
  handler: async (ctx, args) => {
    const coach = await verifyCoachTeamByTeamId(ctx, args.teamId);
    return !!coach;
  },
});

export const correctMatchPlayerMinutes = mutation({
  args: {
    matchPlayerId: v.id("matchPlayers"),
    minutesPlayed: v.number(),
  },
  handler: async (ctx, args) => {
    const matchPlayer = await ctx.db.get(args.matchPlayerId);
    if (!matchPlayer) {
      throw new Error("Spelerrecord niet gevonden");
    }

    const match = await ctx.db.get(matchPlayer.matchId);
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }

    if (match.status !== "finished") {
      throw new Error("Speeltijd kan alleen aangepast worden bij afgeronde wedstrijden");
    }

    const coach = await verifyCoachTeamMembership(ctx, match);
    if (!coach) {
      throw new Error("Geen coachtoegang voor deze wedstrijd");
    }

    if (!Number.isFinite(args.minutesPlayed) || args.minutesPlayed < 0) {
      throw new Error("Ongeldige minutenwaarde");
    }
    if (args.minutesPlayed > 200) {
      throw new Error("Minutenwaarde is onrealistisch hoog");
    }

    const roundedMinutes = Math.round(args.minutesPlayed * 10) / 10;
    await ctx.db.patch(matchPlayer._id, {
      minutesPlayed: roundedMinutes,
      lastSubbedInAt: undefined,
    });

    return { success: true, minutesPlayed: roundedMinutes };
  },
});

function getMatchSeason(match: Doc<"matches">): number | null {
  if (!match.scheduledAt && !match.finishedAt) {
    return null;
  }
  const timestamp = match.scheduledAt ?? match.finishedAt;
  if (!timestamp) return null;
  return new Date(timestamp).getFullYear();
}

export const getSeasonPlayingTime = query({
  args: {
    teamId: v.id("teams"),
    season: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    const finishedMatches = matches.filter((match) => {
      if (match.status !== "finished") return false;
      if (args.season == null) return true;
      return getMatchSeason(match) === args.season;
    });

    const playerMinutes = new Map<string, number>();

    for (const match of finishedMatches) {
      const matchPlayers = await ctx.db
        .query("matchPlayers")
        .withIndex("by_match", (q) => q.eq("matchId", match._id))
        .collect();

      for (const matchPlayer of matchPlayers) {
        const current = playerMinutes.get(String(matchPlayer.playerId)) ?? 0;
        playerMinutes.set(
          String(matchPlayer.playerId),
          current + (matchPlayer.minutesPlayed ?? 0)
        );
      }
    }

    const playerIds = Array.from(playerMinutes.keys());
    const playerDocs = await Promise.all(
      playerIds.map((playerId) => ctx.db.get(playerId as Doc<"players">["_id"]))
    );
    const playerMap = Object.fromEntries(
      playerDocs
        .filter((player): player is Doc<"players"> => player !== null)
        .map((player) => [String(player._id), player.name])
    );

    const totals = playerIds
      .map((playerId) => ({
        playerId,
        playerName: playerMap[playerId] ?? "Onbekend",
        minutesPlayed: Math.round((playerMinutes.get(playerId) ?? 0) * 10) / 10,
      }))
      .sort((a, b) => b.minutesPlayed - a.minutesPlayed);

    return {
      season: args.season ?? null,
      matchesCount: finishedMatches.length,
      totals,
    };
  },
});
