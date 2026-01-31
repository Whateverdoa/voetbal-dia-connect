import { query } from "./_generated/server";
import { v } from "convex/values";

// Get match by public code (for spectators)
export const getByPublicCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const match = await ctx.db
      .query("matches")
      .withIndex("by_code", (q) => q.eq("publicCode", args.code.toUpperCase()))
      .first();
    
    if (!match) return null;

    // Get team info
    const team = await ctx.db.get(match.teamId);
    const club = team ? await ctx.db.get(team.clubId) : null;

    // Get events for timeline
    const events = await ctx.db
      .query("matchEvents")
      .withIndex("by_match", (q) => q.eq("matchId", match._id))
      .collect();

    // Get player names for events
    const playerIds = new Set<string>();
    events.forEach((e) => {
      if (e.playerId) playerIds.add(e.playerId);
      if (e.relatedPlayerId) playerIds.add(e.relatedPlayerId);
    });

    const players = await Promise.all(
      Array.from(playerIds).map((id) => ctx.db.get(id as any))
    );
    const playerMap = Object.fromEntries(
      players.filter(Boolean).map((p: any) => [p._id, p.name])
    );

    // Enrich events with player names
    const enrichedEvents = events.map((e) => ({
      ...e,
      playerName: e.playerId ? playerMap[e.playerId] : undefined,
      relatedPlayerName: e.relatedPlayerId ? playerMap[e.relatedPlayerId] : undefined,
    }));

    // If showLineup, get lineup info
    let lineup = null;
    if (match.showLineup) {
      const matchPlayers = await ctx.db
        .query("matchPlayers")
        .withIndex("by_match", (q) => q.eq("matchId", match._id))
        .collect();

      const lineupPlayers = await Promise.all(
        matchPlayers.map(async (mp) => {
          const player = await ctx.db.get(mp.playerId);
          return player ? {
            id: mp.playerId,
            name: player.name,
            number: player.number,
            onField: mp.onField,
            isKeeper: mp.isKeeper,
          } : null;
        })
      );

      lineup = lineupPlayers.filter(Boolean);
    }

    return {
      id: match._id,
      opponent: match.opponent,
      isHome: match.isHome,
      status: match.status,
      currentQuarter: match.currentQuarter,
      quarterCount: match.quarterCount,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      showLineup: match.showLineup,
      startedAt: match.startedAt,
      teamName: team?.name ?? "Team",
      clubName: club?.name ?? "Club",
      events: enrichedEvents,
      lineup,
    };
  },
});

// Get match for coach (with PIN auth)
export const getForCoach = query({
  args: { matchId: v.id("matches"), pin: v.string() },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match || match.coachPin !== args.pin) return null;

    const team = await ctx.db.get(match.teamId);
    
    // Get all match players
    const matchPlayers = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("matchId", match._id))
      .collect();

    const players = await Promise.all(
      matchPlayers.map(async (mp) => {
        const player = await ctx.db.get(mp.playerId);
        return player ? {
          matchPlayerId: mp._id,
          playerId: mp.playerId,
          name: player.name,
          number: player.number,
          onField: mp.onField,
          isKeeper: mp.isKeeper,
        } : null;
      })
    );

    // Get events
    const events = await ctx.db
      .query("matchEvents")
      .withIndex("by_match", (q) => q.eq("matchId", match._id))
      .collect();

    // Player map for events
    const allPlayerIds = new Set<string>();
    events.forEach((e) => {
      if (e.playerId) allPlayerIds.add(e.playerId);
      if (e.relatedPlayerId) allPlayerIds.add(e.relatedPlayerId);
    });
    const allPlayers = await Promise.all(
      Array.from(allPlayerIds).map((id) => ctx.db.get(id as any))
    );
    const playerMap = Object.fromEntries(
      allPlayers.filter(Boolean).map((p: any) => [p._id, p.name])
    );

    const enrichedEvents = events.map((e) => ({
      ...e,
      playerName: e.playerId ? playerMap[e.playerId] : undefined,
      relatedPlayerName: e.relatedPlayerId ? playerMap[e.relatedPlayerId] : undefined,
    }));

    return {
      ...match,
      teamName: team?.name ?? "Team",
      players: players.filter(Boolean),
      events: enrichedEvents,
    };
  },
});

// List matches for a team
export const listByTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("matches")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .order("desc")
      .collect();
  },
});

// Verify coach PIN and get accessible matches
export const verifyCoachPin = query({
  args: { pin: v.string() },
  handler: async (ctx, args) => {
    const coach = await ctx.db
      .query("coaches")
      .withIndex("by_pin", (q) => q.eq("pin", args.pin))
      .first();

    if (!coach) return null;

    // Get teams
    const teams = await Promise.all(
      coach.teamIds.map((id) => ctx.db.get(id))
    );

    // Get recent matches for these teams
    const matches = await Promise.all(
      coach.teamIds.map(async (teamId) => {
        return await ctx.db
          .query("matches")
          .withIndex("by_team", (q) => q.eq("teamId", teamId))
          .order("desc")
          .take(10);
      })
    );

    return {
      coach: { id: coach._id, name: coach.name },
      teams: teams.filter(Boolean).map((t) => ({ id: t!._id, name: t!.name })),
      matches: matches.flat(),
    };
  },
});
