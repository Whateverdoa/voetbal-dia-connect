import { query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { v } from "convex/values";

// Get team by slug (public query)
export const getBySlug = query({
  args: { teamSlug: v.string() },
  handler: async (ctx, args) => {
    const team = await ctx.db
      .query("teams")
      .withIndex("by_slug_only", (q) => q.eq("slug", args.teamSlug.toLowerCase()))
      .first();

    if (!team) return null;

    const club = await ctx.db.get(team.clubId);

    return {
      id: team._id,
      name: team.name,
      slug: team.slug,
      clubId: team.clubId,
      clubName: club?.name ?? "Club",
      clubSlug: club?.slug ?? "club",
    };
  },
});

// Get match history for a team (finished matches only, most recent first)
export const getMatchHistory = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    // Get all finished matches for this team
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .order("desc")
      .collect();

    const finishedMatches = matches.filter((m) => m.status === "finished");

    // Enrich each match with goal scorers
    const enrichedMatches = await Promise.all(
      finishedMatches.map(async (match) => {
        // Get goal events for this match
        const events = await ctx.db
          .query("matchEvents")
          .withIndex("by_match_type", (q) =>
            q.eq("matchId", match._id).eq("type", "goal")
          )
          .collect();

        const matchPlayers = await ctx.db
          .query("matchPlayers")
          .withIndex("by_match", (q) => q.eq("matchId", match._id))
          .collect();

        // Get player names for goal scorers (only our team's goals)
        const ourGoals = events.filter(
          (e) => !e.isOpponentGoal && !e.isOwnGoal
        );
        const playerIds = [
          ...new Set(
            events
              .flatMap((event) => [event.playerId, event.relatedPlayerId])
              .filter(Boolean)
          ),
        ];

        const players = await Promise.all(
          playerIds.map((id) => ctx.db.get(id as Id<"players">))
        );
        const playerMap = Object.fromEntries(
          players.filter(Boolean).map((p) => [p!._id, p!.name])
        );

        // Count goals per player
        const scorerCounts: Record<string, { name: string; count: number }> = {};
        for (const event of ourGoals) {
          if (event.playerId && playerMap[event.playerId]) {
            const name = playerMap[event.playerId];
            if (!scorerCounts[event.playerId]) {
              scorerCounts[event.playerId] = { name, count: 0 };
            }
            scorerCounts[event.playerId].count++;
          }
        }

        const scorers = Object.values(scorerCounts).map((s) =>
          s.count > 1 ? `${s.name} (${s.count}x)` : s.name
        );

        const matchPlayerIds = [
          ...new Set(matchPlayers.map((matchPlayer) => matchPlayer.playerId)),
        ];
        const matchPlayerDocs = await Promise.all(
          matchPlayerIds.map((playerId) => ctx.db.get(playerId))
        );
        const matchPlayerMap = Object.fromEntries(
          matchPlayerDocs
            .filter((player): player is Doc<"players"> => player !== null)
            .map((player) => [player._id, player.name])
        );

        const playingTime = matchPlayers
          .map((matchPlayer) => ({
            matchPlayerId: matchPlayer._id,
            playerId: matchPlayer.playerId,
            playerName: matchPlayerMap[matchPlayer.playerId] ?? "Onbekend",
            minutesPlayed: Math.round((matchPlayer.minutesPlayed ?? 0) * 10) / 10,
          }))
          .sort((a, b) => b.minutesPlayed - a.minutesPlayed);

        const goalEvents = events
          .map((event) => ({
            eventId: event._id,
            playerId: event.playerId ?? null,
            relatedPlayerId: event.relatedPlayerId ?? null,
            playerName: event.playerId ? playerMap[event.playerId] ?? null : null,
            relatedPlayerName: event.relatedPlayerId
              ? playerMap[event.relatedPlayerId] ?? null
              : null,
            quarter: event.quarter,
            displayMinute: event.displayMinute ?? null,
            isOpponentGoal: event.isOpponentGoal ?? false,
            isOwnGoal: event.isOwnGoal ?? false,
            timestamp: event.timestamp,
          }))
          .sort((a, b) => a.timestamp - b.timestamp);

        return {
          id: match._id,
          opponent: match.opponent,
          isHome: match.isHome,
          homeScore: match.homeScore,
          awayScore: match.awayScore,
          scheduledAt: match.scheduledAt,
          finishedAt: match.finishedAt,
          scorers,
          playingTime,
          goalEvents,
        };
      })
    );

    return enrichedMatches.sort((left, right) => {
      const leftTimestamp = left.finishedAt ?? left.scheduledAt ?? 0;
      const rightTimestamp = right.finishedAt ?? right.scheduledAt ?? 0;
      return rightTimestamp - leftTimestamp;
    });
  },
});

// Get season stats for a team
export const getSeasonStats = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    // Get all finished matches
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    const finishedMatches = matches.filter((m) => m.status === "finished");

    // Calculate record
    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;

    for (const match of finishedMatches) {
      // Calculate our score vs opponent score based on home/away
      const ourScore = match.isHome ? match.homeScore : match.awayScore;
      const theirScore = match.isHome ? match.awayScore : match.homeScore;

      goalsFor += ourScore;
      goalsAgainst += theirScore;

      if (ourScore > theirScore) {
        wins++;
      } else if (ourScore < theirScore) {
        losses++;
      } else {
        draws++;
      }
    }

    // Get all goal events to calculate top scorers
    const allGoalEvents = [];
    for (const match of finishedMatches) {
      const events = await ctx.db
        .query("matchEvents")
        .withIndex("by_match_type", (q) =>
          q.eq("matchId", match._id).eq("type", "goal")
        )
        .collect();

      // Only count our team's goals (not opponent goals or own goals)
      const ourGoals = events.filter((e) => !e.isOpponentGoal && !e.isOwnGoal);
      allGoalEvents.push(...ourGoals);
    }

    // Count goals per player
    const goalCounts: Record<string, number> = {};
    for (const event of allGoalEvents) {
      if (event.playerId) {
        goalCounts[event.playerId] = (goalCounts[event.playerId] || 0) + 1;
      }
    }

    // Get player names for top scorers
    const topScorerIds = Object.entries(goalCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);

    const topScorerPlayers = await Promise.all(
      topScorerIds.map((id) => ctx.db.get(id as Id<"players">))
    );

    const topScorers = topScorerIds
      .map((id, i) => {
        const player = topScorerPlayers[i];
        if (!player) return null;
        return {
          playerId: id,
          name: player.name,
          goals: goalCounts[id],
        };
      })
      .filter(Boolean) as { playerId: string; name: string; goals: number }[];

    return {
      matchesPlayed: finishedMatches.length,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      topScorers,
    };
  },
});
