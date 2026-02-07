import { query } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

// ============================================================================
// MATCH HISTORY & STATS QUERIES (PUBLIC - no PIN required)
// ============================================================================

// Get match history for a team (finished matches only)
export const getMatchHistory = query({
  args: { 
    teamId: v.id("teams"), 
    limit: v.optional(v.number()) 
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20;

    // Get finished matches for this team
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .order("desc")
      .collect();

    // Filter to finished matches only
    const finishedMatches = matches
      .filter((m) => m.status === "finished")
      .slice(0, limit);

    // Enrich each match with goal scorers
    const enrichedMatches = await Promise.all(
      finishedMatches.map(async (match) => {
        // Get goal events for this match
        const goalEvents = await ctx.db
          .query("matchEvents")
          .withIndex("by_match_type", (q) => 
            q.eq("matchId", match._id).eq("type", "goal")
          )
          .collect();

        // Get player names for goal scorers
        const scorerIds = new Set(
          goalEvents
            .filter((e) => e.playerId && !e.isOpponentGoal)
            .map((e) => e.playerId!)
        );

        const scorers = await Promise.all(
          Array.from(scorerIds).map((id) => ctx.db.get(id))
        );

        const scorerMap = Object.fromEntries(
          scorers.filter(Boolean).map((p) => [p!._id, p!.name])
        );

        // Count goals per scorer
        const goalCounts: Record<string, { name: string; count: number }> = {};
        goalEvents
          .filter((e) => e.playerId && !e.isOpponentGoal)
          .forEach((e) => {
            const name = scorerMap[e.playerId!] ?? "Onbekend";
            if (!goalCounts[e.playerId!]) {
              goalCounts[e.playerId!] = { name, count: 0 };
            }
            goalCounts[e.playerId!].count++;
          });

        // Determine result
        const teamScore = match.isHome ? match.homeScore : match.awayScore;
        const opponentScore = match.isHome ? match.awayScore : match.homeScore;
        const result: "win" | "draw" | "loss" = 
          teamScore > opponentScore ? "win" : 
          teamScore < opponentScore ? "loss" : "draw";

        return {
          id: match._id,
          opponent: match.opponent,
          isHome: match.isHome,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          teamScore,
          opponentScore,
          result,
          date: match.finishedAt ?? match.startedAt ?? match.createdAt,
          scorers: Object.values(goalCounts).sort((a, b) => b.count - a.count),
        };
      })
    );

    return enrichedMatches;
  },
});

// Get aggregated season stats for a team
export const getSeasonStats = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    // Get all finished matches for this team
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    const finishedMatches = matches.filter((m) => m.status === "finished");

    // Calculate basic stats
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;

    finishedMatches.forEach((match) => {
      const teamScore = match.isHome ? match.homeScore : match.awayScore;
      const opponentScore = match.isHome ? match.awayScore : match.homeScore;

      goalsFor += teamScore;
      goalsAgainst += opponentScore;

      if (teamScore > opponentScore) wins++;
      else if (teamScore < opponentScore) losses++;
      else draws++;
    });

    // Get all goal events for finished matches to find top scorers
    const matchIds = finishedMatches.map((m) => m._id);
    
    // Aggregate goals per player across all matches
    const playerGoals: Record<string, number> = {};
    const playerAssists: Record<string, number> = {};

    await Promise.all(
      matchIds.map(async (matchId) => {
        const events = await ctx.db
          .query("matchEvents")
          .withIndex("by_match", (q) => q.eq("matchId", matchId))
          .collect();

        events.forEach((e) => {
          if (e.type === "goal" && e.playerId && !e.isOpponentGoal) {
            playerGoals[e.playerId] = (playerGoals[e.playerId] ?? 0) + 1;
          }
          // Count assists from relatedPlayerId on goal events
          if (e.type === "goal" && e.relatedPlayerId && !e.isOpponentGoal) {
            playerAssists[e.relatedPlayerId] = (playerAssists[e.relatedPlayerId] ?? 0) + 1;
          }
        });
      })
    );

    // Get player names for top scorers
    const topScorerIds = Object.entries(playerGoals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => id);

    const scorerPlayers = await Promise.all(
      topScorerIds.map((id) => ctx.db.get(id as Id<"players">))
    );

    const topScorers = topScorerIds.map((id, i) => ({
      playerId: id,
      name: scorerPlayers[i]?.name ?? "Onbekend",
      goals: playerGoals[id],
      assists: playerAssists[id] ?? 0,
    }));

    return {
      matchesPlayed: finishedMatches.length,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      goalDifference: goalsFor - goalsAgainst,
      points: wins * 3 + draws,
      topScorers,
      winPercentage: finishedMatches.length > 0 
        ? Math.round((wins / finishedMatches.length) * 100) 
        : 0,
    };
  },
});

// Get stats for a specific player across all matches
export const getPlayerStats = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    const player = await ctx.db.get(args.playerId);
    if (!player) return null;

    // Use the by_player index for efficient lookup
    const playerMatchRecords = await ctx.db
      .query("matchPlayers")
      .withIndex("by_player", (q) => q.eq("playerId", args.playerId))
      .collect();

    // Get match details and filter to finished matches
    const matchDetails = await Promise.all(
      playerMatchRecords.map(async (mp) => {
        const match = await ctx.db.get(mp.matchId);
        return match?.status === "finished" ? { mp, match } : null;
      })
    );

    const finishedMatchRecords = matchDetails.filter(
      (item): item is { mp: Doc<"matchPlayers">; match: Doc<"matches"> } => item !== null
    );

    // Calculate total minutes played
    const totalMinutes = finishedMatchRecords.reduce(
      (sum, { mp }) => sum + (mp.minutesPlayed ?? 0),
      0
    );

    // Get all events for this player across finished matches
    let goals = 0;
    let assists = 0;
    let yellowCards = 0;
    let redCards = 0;

    await Promise.all(
      finishedMatchRecords.map(async ({ match }) => {
        const events = await ctx.db
          .query("matchEvents")
          .withIndex("by_match", (q) => q.eq("matchId", match._id))
          .collect();

        events.forEach((e) => {
          if (e.playerId === args.playerId) {
            if (e.type === "goal" && !e.isOpponentGoal) goals++;
            if (e.type === "yellow_card") yellowCards++;
            if (e.type === "red_card") redCards++;
          }
          // Count assists (player is relatedPlayerId on goal events)
          if (e.relatedPlayerId === args.playerId && e.type === "goal" && !e.isOpponentGoal) {
            assists++;
          }
        });
      })
    );

    return {
      playerId: args.playerId,
      name: player.name,
      number: player.number,
      matchesPlayed: finishedMatchRecords.length,
      totalMinutes: Math.round(totalMinutes),
      goals,
      assists,
      yellowCards,
      redCards,
      goalsPerMatch: finishedMatchRecords.length > 0 
        ? Math.round((goals / finishedMatchRecords.length) * 100) / 100 
        : 0,
    };
  },
});
