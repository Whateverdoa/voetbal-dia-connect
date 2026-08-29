import { query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import {
  getCurrentUserAccess,
  requireRefereeAccess,
  requireRefereeForMatch,
} from "./lib/userAccess";
import { ADMIN_DISPLAY_NAME, hasAdminRole } from "./lib/adminOverride";
import { listSeasonMatchesForAdminView } from "./lib/adminLiveView";
import { getStoppageAdvisoryMs } from "./lib/stoppageAdvisory";

const REFEREE_STATUS_ORDER: Record<string, number> = {
  live: 0,
  halftime: 1,
  lineup: 2,
  scheduled: 3,
  finished: 4,
};

export const getForReferee = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    try {
      const match = await ctx.db.get(args.matchId);
      if (!match) return null;

      const access = await getCurrentUserAccess(ctx);
      const viewingAsAdmin = hasAdminRole(access);
      const assigned = match.refereeId
        ? await ctx.db.get(match.refereeId)
        : null;

      let refereeName = assigned?.name ?? ADMIN_DISPLAY_NAME;
      if (!viewingAsAdmin) {
        const referee = await requireRefereeForMatch(ctx, match);
        refereeName = referee.name;
      }

      const team = await ctx.db.get(match.teamId);
      const club = team ? await ctx.db.get(team.clubId) : null;
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
      const stoppageAdvisoryMs = await getStoppageAdvisoryMs(
        ctx,
        match._id,
        Date.now(),
      );

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
        scheduledAt: match.scheduledAt,
        startedAt: match.startedAt,
        quarterStartedAt: match.quarterStartedAt,
        pausedAt: match.pausedAt,
        accumulatedPauseTime: match.accumulatedPauseTime,
        frozenClockMs: match.frozenClockMs,
        activeStoppageStartedAt: match.activeStoppageStartedAt,
        stoppageAdvisoryMs,
        useBreakClock: match.useBreakClock,
        breakClockAutoStart: match.breakClockAutoStart,
        halftimeStartedAt: match.halftimeStartedAt,
        scheduledBreakEndAt: match.scheduledBreakEndAt,
        teamName: team?.name ?? "Team",
        teamLogoUrl: team?.logoUrl,
        clubLogoUrl: club?.logoUrl,
        opponentLogoUrl: match.opponentLogoUrl,
        refereeName,
        diaPlayers,
        viewingAsAdmin,
      };
    } catch {
      return null;
    }
  },
});

export const getMatchesForReferee = query({
  args: { seasonKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    try {
      const access = await getCurrentUserAccess(ctx);
      if (hasAdminRole(access) && args.seasonKey) {
        return await buildAdminRefereeDashboard(ctx, args.seasonKey);
      }

      const { referee } = await requireRefereeAccess(ctx);
      const matches = await ctx.db
        .query("matches")
        .withIndex("by_refereeId", (q) => q.eq("refereeId", referee._id))
        .collect();

      const enriched = await Promise.all(
        matches.map(async (match) => {
          const team = await ctx.db.get(match.teamId);
          const club = team ? await ctx.db.get(team.clubId) : null;
          return {
            id: match._id,
            teamId: match.teamId,
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
            teamLogoUrl: team?.logoUrl,
            clubLogoUrl: club?.logoUrl,
            opponentLogoUrl: match.opponentLogoUrl,
          };
        })
      );

      enriched.sort(
        (left, right) =>
          (REFEREE_STATUS_ORDER[left.status] ?? 5) -
          (REFEREE_STATUS_ORDER[right.status] ?? 5)
      );

      return {
        referee: { id: referee._id, name: referee.name },
        matches: enriched,
        viewingAsAdmin: false,
      };
    } catch {
      return null;
    }
  },
});

async function buildAdminRefereeDashboard(ctx: QueryCtx, seasonKey: string) {
  const identity = await ctx.auth.getUserIdentity();
  const { rows } = await listSeasonMatchesForAdminView(ctx, seasonKey);
  const matches = rows.map(({ match, teamName, logos }) => ({
    id: match._id,
    teamId: match.teamId,
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
    teamName,
    ...logos,
  }));

  matches.sort(
    (left, right) =>
      (REFEREE_STATUS_ORDER[left.status] ?? 5) -
      (REFEREE_STATUS_ORDER[right.status] ?? 5)
  );

  return {
    referee: {
      name: identity?.name?.trim() || ADMIN_DISPLAY_NAME,
    },
    matches,
    viewingAsAdmin: true,
  };
}
