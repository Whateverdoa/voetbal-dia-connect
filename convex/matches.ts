/**
 * Match queries - public and coach views
 * 
 * Playing time queries are in matchQueries.ts
 */
import { query } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import {
  applyGoalEnrichments,
  deriveOpenStagedSubstitutions,
  isCoachOnlyEvent,
} from "./lib/matchEventProjection";
import { logoFieldsForMatchWithTeamClub } from "./lib/matchLogoFields";

// Re-export from split modules for backwards compatibility
export { getPlayingTime, getSuggestedSubstitutions } from "./matchQueries";
export { listPublicMatches } from "./publicQueries";
export {
  listActiveReferees,
  getCoachTeamSetup,
  listByTeam,
  listTeamPlayersNotInMatch,
  verifyCoachPin,
} from "./coachQueries";
export { getForReferee, getMatchesForReferee } from "./refereeQueries";

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
    events.sort((a, b) => a.createdAt - b.createdAt || String(a._id).localeCompare(String(b._id)));

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
      matchMs: e.matchMs ?? (e.gameSecond != null ? e.gameSecond * 1000 : undefined),
    }));
    const projectedEvents = applyGoalEnrichments(enrichedEvents).filter(
      (event) => !isCoachOnlyEvent(event)
    );

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
      regulationDurationMinutes: match.regulationDurationMinutes,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      showLineup: match.showLineup,
      scheduledAt: match.scheduledAt,
      startedAt: match.startedAt,
      quarterStartedAt: match.quarterStartedAt,
      pausedAt: match.pausedAt,
      accumulatedPauseTime: match.accumulatedPauseTime,
      teamName: team?.name ?? "Team",
      teamSlug: team?.slug ?? "",
      clubName: club?.name ?? "Club",
      teamLogoUrl: team?.logoUrl ?? null,
      clubLogoUrl: club?.logoUrl ?? null,
      opponentLogoUrl: match.opponentLogoUrl ?? null,
      /** True if a match official is assigned; never exposes their name publicly. */
      refereeAssigned: match.refereeId != null,
      events: projectedEvents,
      lineup,
    };
  },
});

// Get match for coach (identity-based)
export const getForCoach = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return null;

    const identity = await ctx.auth.getUserIdentity();
    const email = identity?.email?.trim().toLowerCase();
    if (!email) return null;

    const coach = await ctx.db
      .query("coaches")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!coach || !coach.teamIds.includes(match.teamId)) return null;

    const now = Date.now();
    const team = await ctx.db.get(match.teamId);
    const club = team ? await ctx.db.get(team.clubId) : null;

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
    events.sort((a, b) => a.createdAt - b.createdAt || String(a._id).localeCompare(String(b._id)));

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
      matchMs: e.matchMs ?? (e.gameSecond != null ? e.gameSecond * 1000 : undefined),
    }));
    const projectedEvents = applyGoalEnrichments(enrichedEvents);
    const stagedSubstitutions = deriveOpenStagedSubstitutions(projectedEvents);

    // Resolve referee name if assigned
    const referee = match.refereeId
      ? await ctx.db.get(match.refereeId)
      : null;

    // Resolve lead coach name
    const leadCoach = match.leadCoachId
      ? await ctx.db.get(match.leadCoachId)
      : null;

    const { coachPin: _legacyCoachPin, ...safeMatch } = match;

    const isCurrentCoachLead = match.leadCoachId === coach._id;
    const canControlClock = !!match.refereeId || isCurrentCoachLead;

    return {
      ...safeMatch,
      teamName: team?.name ?? "Team",
      ...logoFieldsForMatchWithTeamClub(match, team, club),
      players: players.filter(Boolean),
      events: projectedEvents,
      stagedSubstitutions,
      refereeName: referee?.name ?? null,
      leadCoachId: safeMatch.leadCoachId ?? null,
      leadCoachName: leadCoach?.name ?? null,
      hasLead: !!safeMatch.leadCoachId,
      isCurrentCoachLead,
      canControlClock,
    };
  },
});



