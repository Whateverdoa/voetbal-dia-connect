/**
 * Match queries - public and coach views
 * 
 * Playing time queries are in matchQueries.ts
 */
import { query } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

// Re-export from split modules for backwards compatibility
export { getPlayingTime, getSuggestedSubstitutions } from "./matchQueries";
export { listPublicMatches } from "./publicQueries";
export {
  listActiveReferees,
  listByTeam,
  listTeamPlayersNotInMatch,
  verifyCoachPin,
} from "./coachQueries";

// Get match by public code (for spectators)
export const getByPublicCode = query({
  args: { code: v.string() },
  handler: async (ctx, args) => {
    const match = await ctx.db
      .query("matches")
      .withIndex("by_code", (q) => q.eq("publicCode", args.code.toUpperCase()))
      .first();
    
    if (!match) return null;

    const team = await ctx.db.get(match.teamId);
    const club = team ? await ctx.db.get(team.clubId) : null;

    const events = await ctx.db
      .query("matchEvents")
      .withIndex("by_match", (q) => q.eq("matchId", match._id))
      .collect();

    const playerIds = new Set<string>();
    events.forEach((e) => {
      if (e.playerId) playerIds.add(e.playerId);
      if (e.relatedPlayerId) playerIds.add(e.relatedPlayerId);
    });

    const players = await Promise.all(
      Array.from(playerIds).map((id) => ctx.db.get(id as Id<"players">))
    );
    const playerMap = Object.fromEntries(
      players.filter((p): p is Doc<"players"> => p !== null).map((p) => [p._id, p.name])
    );

    const enrichedEvents = events.map((e) => ({
      ...e,
      playerName: e.playerId ? playerMap[e.playerId] : undefined,
      relatedPlayerName: e.relatedPlayerId ? playerMap[e.relatedPlayerId] : undefined,
    }));

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
      quarterStartedAt: match.quarterStartedAt,
      pausedAt: match.pausedAt,
      accumulatedPauseTime: match.accumulatedPauseTime,
      teamName: team?.name ?? "Team",
      teamSlug: team?.slug ?? "",
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
    if (!match) return null;

    // Verify coach belongs to the match's team
    const coach = await ctx.db
      .query("coaches")
      .withIndex("by_pin", (q) => q.eq("pin", args.pin))
      .first();
    if (!coach || !coach.teamIds.includes(match.teamId)) return null;

    const now = Date.now();
    const team = await ctx.db.get(match.teamId);
    
    const matchPlayers = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("matchId", match._id))
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
          matchPlayerId: mp._id,
          playerId: mp.playerId,
          name: player.name,
          number: player.number,
          onField: mp.onField,
          isKeeper: mp.isKeeper,
          absent: mp.absent ?? false,
          minutesPlayed: Math.round(totalMinutes * 10) / 10,
          positionPrimary: player.positionPrimary,
          positionSecondary: player.positionSecondary,
          fieldSlotIndex: mp.fieldSlotIndex,
        };
      })
    );

    const events = await ctx.db
      .query("matchEvents")
      .withIndex("by_match", (q) => q.eq("matchId", match._id))
      .collect();

    const allPlayerIds = new Set<string>();
    events.forEach((e) => {
      if (e.playerId) allPlayerIds.add(e.playerId);
      if (e.relatedPlayerId) allPlayerIds.add(e.relatedPlayerId);
    });
    const allPlayers = await Promise.all(
      Array.from(allPlayerIds).map((id) => ctx.db.get(id as Id<"players">))
    );
    const playerMap = Object.fromEntries(
      allPlayers.filter((p): p is Doc<"players"> => p !== null).map((p) => [p._id, p.name])
    );

    const enrichedEvents = events.map((e) => ({
      ...e,
      playerName: e.playerId ? playerMap[e.playerId] : undefined,
      relatedPlayerName: e.relatedPlayerId ? playerMap[e.relatedPlayerId] : undefined,
    }));

    // Resolve referee name if assigned
    const referee = match.refereeId
      ? await ctx.db.get(match.refereeId)
      : null;

    // Resolve lead coach name
    const leadCoach = match.leadCoachId
      ? await ctx.db.get(match.leadCoachId)
      : null;

    // Strip coachPin from response — coach already knows it, no need to send over wire
    const { coachPin: _pin, ...safeMatch } = match;

    const isCurrentCoachLead = match.leadCoachId === coach._id;
    const canControlClock =
      !!match.refereeId || isCurrentCoachLead;

    return {
      ...safeMatch,
      teamName: team?.name ?? "Team",
      players: players.filter(Boolean),
      events: enrichedEvents,
      refereeName: referee?.name ?? null,
      leadCoachId: safeMatch.leadCoachId ?? null,
      leadCoachName: leadCoach?.name ?? null,
      hasLead: !!safeMatch.leadCoachId,
      isCurrentCoachLead,
      canControlClock,
    };
  },
});

// Get match for referee (verify referee PIN via referees table + assignment)
export const getForReferee = query({
  args: { code: v.string(), pin: v.string() },
  handler: async (ctx, args) => {
    // 1. Look up the referee globally by PIN
    const referee = await ctx.db
      .query("referees")
      .withIndex("by_pin", (q) => q.eq("pin", args.pin))
      .first();
    if (!referee || !referee.active) return null;

    // 2. Look up the match by public code
    const match = await ctx.db
      .query("matches")
      .withIndex("by_code", (q) => q.eq("publicCode", args.code.toUpperCase()))
      .first();
    if (!match) return null;

    // 3. Verify this referee is assigned to this match
    if (!match.refereeId || match.refereeId !== referee._id) return null;

    const team = await ctx.db.get(match.teamId);

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
    };
  },
});

// Get all matches assigned to a referee (referee enters PIN → sees match list)
export const getMatchesForReferee = query({
  args: { pin: v.string() },
  handler: async (ctx, args) => {
    // 1. Look up the referee by PIN
    const referee = await ctx.db
      .query("referees")
      .withIndex("by_pin", (q) => q.eq("pin", args.pin))
      .first();
    if (!referee || !referee.active) return null;

    // 2. Find all matches assigned to this referee
    const matches = await ctx.db
      .query("matches")
      .withIndex("by_refereeId", (q) => q.eq("refereeId", referee._id))
      .collect();

    // 3. Enrich each match with team name
    const enriched = await Promise.all(
      matches.map(async (m) => {
        const team = await ctx.db.get(m.teamId);
        return {
          id: m._id,
          publicCode: m.publicCode,
          opponent: m.opponent,
          isHome: m.isHome,
          status: m.status,
          currentQuarter: m.currentQuarter,
          quarterCount: m.quarterCount,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          scheduledAt: m.scheduledAt,
          startedAt: m.startedAt,
          finishedAt: m.finishedAt,
          teamName: team?.name ?? "Team",
        };
      })
    );

    // Sort: live first, then scheduled, then finished
    const statusOrder: Record<string, number> = {
      live: 0,
      halftime: 1,
      lineup: 2,
      scheduled: 3,
      finished: 4,
    };
    enriched.sort(
      (a, b) => (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5)
    );

    return {
      referee: { id: referee._id, name: referee.name },
      matches: enriched,
    };
  },
});

