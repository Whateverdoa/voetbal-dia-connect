/**
 * Coach-specific queries and misc queries re-exported via matches.ts.
 */
import { query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { normalizeQualificationTags } from "../src/lib/admin/assignmentBoard";
import {
  getCurrentUserAccess,
  requireCoachAccess,
  requireCoachForMatch,
  requireCoachForTeam,
} from "./lib/userAccess";
import { hasAdminRole, ADMIN_DISPLAY_NAME } from "./lib/adminOverride";
import { listSeasonMatchesForAdminView } from "./lib/adminLiveView";
import { logoFieldsForMatchWithTeamClub } from "./lib/matchLogoFields";

export const listActiveReferees = query({
  handler: async (ctx) => {
    const all = await ctx.db.query("referees").collect();
    return all
      .filter((referee) => referee.active)
      .map((referee) => ({
        id: referee._id,
        name: referee.name,
        qualificationTags: normalizeQualificationTags(referee.qualificationTags),
      }));
  },
});

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

export const getCoachTeamSetup = query({
  args: { teamId: v.id("teams") },
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
    if (!team) {
      return null;
    }

    const players = await ctx.db
      .query("players")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    return {
      team: {
        _id: team._id,
        name: team.name,
        slug: team.slug,
      },
      players,
    };
  },
});

export const listTeamPlayersNotInMatch = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return null;

    try {
      const access = await getCurrentUserAccess(ctx);
      if (!hasAdminRole(access)) {
        await requireCoachForMatch(ctx, match);
      }
    } catch {
      return null;
    }

    const inMatch = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();
    const inMatchIds = new Set(inMatch.map((matchPlayer) => matchPlayer.playerId));

    const allTeam = await ctx.db
      .query("players")
      .withIndex("by_team", (q) => q.eq("teamId", match.teamId))
      .collect();

    return allTeam
      .filter((player) => player.active && !inMatchIds.has(player._id))
      .map((player) => ({
        id: player._id,
        name: player.name,
        number: player.number,
      }));
  },
});

export const verifyCoachAccess = query({
  args: { seasonKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    try {
      const access = await getCurrentUserAccess(ctx);
      if (hasAdminRole(access) && args.seasonKey) {
        return await buildAdminCoachDashboard(ctx, args.seasonKey);
      }

      const { coach } = await requireCoachAccess(ctx);
      const teamIds = [...new Set(coach.teamIds)];
      const teams = await Promise.all(teamIds.map((teamId) => ctx.db.get(teamId)));
      const matches = await Promise.all(
        teamIds.map((teamId) =>
          ctx.db
            .query("matches")
            .withIndex("by_team", (q) => q.eq("teamId", teamId))
            .order("desc")
            .take(200)
        )
      );

      const flat = matches.flat();
      const enriched = await Promise.all(
        flat.map(async (match) => {
          const teamDoc = await ctx.db.get(match.teamId);
          const club = teamDoc ? await ctx.db.get(teamDoc.clubId) : null;
          return {
            _id: match._id,
            teamId: match.teamId,
            opponent: match.opponent,
            isHome: match.isHome,
            status: match.status,
            currentQuarter: match.currentQuarter,
            homeScore: match.homeScore,
            awayScore: match.awayScore,
            publicCode: match.publicCode,
            scheduledAt: match.scheduledAt,
            teamName: teamDoc?.name ?? "Team",
            ...logoFieldsForMatchWithTeamClub(match, teamDoc, club),
          };
        })
      );

      return {
        coach: { id: coach._id, name: coach.name },
        teams: teams
          .filter((team): team is NonNullable<typeof team> => team !== null)
          .map((team) => ({ id: team._id, name: team.name, slug: team.slug })),
        matches: enriched,
        viewingAsAdmin: false,
      };
    } catch {
      return null;
    }
  },
});

async function buildAdminCoachDashboard(ctx: QueryCtx, seasonKey: string) {
  const identity = await ctx.auth.getUserIdentity();
  const { rows, teams } = await listSeasonMatchesForAdminView(ctx, seasonKey);
  const matches = rows.map(({ match, teamName, logos }) => ({
    _id: match._id,
    teamId: match.teamId,
    opponent: match.opponent,
    isHome: match.isHome,
    status: match.status,
    currentQuarter: match.currentQuarter,
    homeScore: match.homeScore,
    awayScore: match.awayScore,
    publicCode: match.publicCode,
    scheduledAt: match.scheduledAt,
    teamName,
    ...logos,
  }));

  return {
    coach: {
      id: "admin",
      name: identity?.name?.trim() || ADMIN_DISPLAY_NAME,
    },
    teams,
    matches,
    viewingAsAdmin: true,
  };
}
