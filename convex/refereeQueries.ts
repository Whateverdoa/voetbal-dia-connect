import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireRefereeAccess, requireRefereeForMatch } from "./lib/userAccess";

export const getForReferee = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    try {
      const match = await ctx.db.get(args.matchId);
      if (!match) return null;

      const referee = await requireRefereeForMatch(ctx, match);
      const team = await ctx.db.get(match.teamId);
      const matchPlayers = await ctx.db
        .query("matchPlayers")
        .withIndex("by_match", (q) => q.eq("matchId", match._id))
        .collect();

      const diaPlayers = await Promise.all(
        matchPlayers
          .filter((matchPlayer) => !matchPlayer.absent)
          .map(async (matchPlayer) => {
            const player = await ctx.db.get(matchPlayer.playerId);
            return {
              playerId: matchPlayer.playerId,
              name: player?.name ?? "Onbekende speler",
              number: player?.number,
              onField: matchPlayer.onField,
            };
          })
      );

      return {
        id: match._id,
        opponent: match.opponent,
        isHome: match.isHome,
        status: match.status,
        currentQuarter: match.currentQuarter,
        quarterCount: match.quarterCount,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
        startedAt: match.startedAt,
        quarterStartedAt: match.quarterStartedAt,
        pausedAt: match.pausedAt,
        accumulatedPauseTime: match.accumulatedPauseTime,
        teamName: team?.name ?? "Team",
        refereeName: referee.name,
        diaPlayers,
      };
    } catch {
      return null;
    }
  },
});

export const getMatchesForReferee = query({
  args: {},
  handler: async (ctx) => {
    try {
      const { referee } = await requireRefereeAccess(ctx);
      const matches = await ctx.db
        .query("matches")
        .withIndex("by_refereeId", (q) => q.eq("refereeId", referee._id))
        .collect();

      const enriched = await Promise.all(
        matches.map(async (match) => {
          const team = await ctx.db.get(match.teamId);
          return {
            id: match._id,
            publicCode: match.publicCode,
            opponent: match.opponent,
            isHome: match.isHome,
            status: match.status,
            currentQuarter: match.currentQuarter,
            quarterCount: match.quarterCount,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
            scheduledAt: match.scheduledAt,
            startedAt: match.startedAt,
            finishedAt: match.finishedAt,
            teamName: team?.name ?? "Team",
          };
        })
      );

      const statusOrder: Record<string, number> = {
        live: 0,
        halftime: 1,
        lineup: 2,
        scheduled: 3,
        finished: 4,
      };

      enriched.sort(
        (left, right) =>
          (statusOrder[left.status] ?? 5) - (statusOrder[right.status] ?? 5)
      );

      return {
        referee: { id: referee._id, name: referee.name },
        matches: enriched,
      };
    } catch {
      return null;
    }
  },
});
