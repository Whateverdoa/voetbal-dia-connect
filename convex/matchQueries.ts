/**
 * Match queries - playing time and substitution suggestions
 * Split from matches.ts to keep files under 300 LOC
 */
import { query } from "./_generated/server";
import { v } from "convex/values";
import { verifyCoachTeamMembership } from "./pinHelpers";

// Get playing time for all players in a match
export const getPlayingTime = query({
  args: { matchId: v.id("matches"), pin: v.string() },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return null;
    if (!(await verifyCoachTeamMembership(ctx, match, args.pin))) return null;

    const now = Date.now();
    const matchPlayers = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();

    const players = await Promise.all(
      matchPlayers.map(async (mp) => {
        const player = await ctx.db.get(mp.playerId);
        if (!player) return null;

        let totalMinutes = mp.minutesPlayed ?? 0;
        if (mp.onField && mp.lastSubbedInAt && match.status === "live") {
          totalMinutes += (now - mp.lastSubbedInAt) / 60000;
        }

        return {
          playerId: mp.playerId,
          matchPlayerId: mp._id,
          name: player.name,
          number: player.number,
          minutesPlayed: Math.round(totalMinutes * 10) / 10,
          onField: mp.onField,
          isKeeper: mp.isKeeper,
        };
      })
    );

    const validPlayers = players.filter(Boolean) as NonNullable<typeof players[number]>[];
    validPlayers.sort((a, b) => a.minutesPlayed - b.minutesPlayed);

    return {
      matchId: args.matchId,
      status: match.status,
      currentQuarter: match.currentQuarter,
      players: validPlayers,
    };
  },
});

// Get suggested substitutions based on fairness (equal playing time)
export const getSuggestedSubstitutions = query({
  args: { matchId: v.id("matches"), pin: v.string() },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return null;
    if (!(await verifyCoachTeamMembership(ctx, match, args.pin))) return null;

    const now = Date.now();
    const matchPlayers = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();

    const playersWithTime = await Promise.all(
      matchPlayers.map(async (mp) => {
        const player = await ctx.db.get(mp.playerId);
        if (!player) return null;

        let totalMinutes = mp.minutesPlayed ?? 0;
        if (mp.onField && mp.lastSubbedInAt && match.status === "live") {
          totalMinutes += (now - mp.lastSubbedInAt) / 60000;
        }

        return {
          playerId: mp.playerId,
          name: player.name,
          number: player.number,
          minutesPlayed: Math.round(totalMinutes * 10) / 10,
          onField: mp.onField,
          isKeeper: mp.isKeeper,
        };
      })
    );

    const validPlayers = playersWithTime.filter(Boolean) as NonNullable<typeof playersWithTime[number]>[];
    const onField = validPlayers
      .filter((p) => p.onField && !p.isKeeper)
      .sort((a, b) => b.minutesPlayed - a.minutesPlayed);
    const onBench = validPlayers
      .filter((p) => !p.onField)
      .sort((a, b) => a.minutesPlayed - b.minutesPlayed);

    const suggestions: Array<{
      playerOut: typeof validPlayers[number];
      playerIn: typeof validPlayers[number];
      timeDifference: number;
      reason: string;
    }> = [];

    const maxSuggestions = Math.min(onField.length, onBench.length, 3);
    for (let i = 0; i < maxSuggestions; i++) {
      const playerOut = onField[i];
      const playerIn = onBench[i];
      if (!playerOut || !playerIn) break;

      const timeDiff = playerOut.minutesPlayed - playerIn.minutesPlayed;
      if (timeDiff > 2) {
        suggestions.push({
          playerOut,
          playerIn,
          timeDifference: Math.round(timeDiff * 10) / 10,
          reason: `${playerIn.name} heeft ${Math.round(timeDiff)} min minder gespeeld`,
        });
      }
    }

    return {
      matchId: args.matchId,
      suggestions,
      onFieldCount: onField.length + (validPlayers.find((p) => p.isKeeper && p.onField) ? 1 : 0),
      benchCount: onBench.length,
    };
  },
});
