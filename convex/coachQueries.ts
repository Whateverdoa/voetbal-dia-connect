/**
 * Coach-specific queries and misc queries re-exported via matches.ts.
 */
import { query } from "./_generated/server";
import { v } from "convex/values";
import { normalizeQualificationTags } from "../src/lib/admin/assignmentBoard";
import {
  requireCoachAccess,
  requireCoachForMatch,
  requireCoachForTeam,
} from "./lib/userAccess";

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
      await requireCoachForTeam(ctx, args.teamId);
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
      await requireCoachForMatch(ctx, match);
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

export const verifyCoachPin = query({
  args: {},
  handler: async (ctx) => {
    try {
      const { coach } = await requireCoachAccess(ctx);
      const teams = await Promise.all(coach.teamIds.map((teamId) => ctx.db.get(teamId)));
      const matches = await Promise.all(
        coach.teamIds.map((teamId) =>
          ctx.db
            .query("matches")
            .withIndex("by_team", (q) => q.eq("teamId", teamId))
            .order("desc")
            .take(200)
        )
      );

      return {
        coach: { id: coach._id, name: coach.name },
        teams: teams
          .filter((team): team is NonNullable<typeof team> => team !== null)
          .map((team) => ({ id: team._id, name: team.name })),
        matches: matches.flat(),
      };
    } catch {
      return null;
    }
  },
});
