/**
 * Coach-specific queries and misc queries re-exported via matches.ts.
 *
 * Split from matches.ts to respect the 300-LOC rule.
 */
import { query } from "./_generated/server";
import { v } from "convex/values";
import type { QueryCtx } from "./_generated/server";
import { hasAdminAccess } from "./adminAuth";

/** Resolve coach by Clerk identity (email) only. */
async function resolveCoachByIdentity(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  const identityEmail = identity?.email?.toLowerCase();
  if (identityEmail) {
    const byEmail = await ctx.db
      .query("coaches")
      .withIndex("by_email", (q) => q.eq("email", identityEmail))
      .first();
    if (byEmail) return byEmail;
  }

  return null;
}

// List active referees (for coach assignment dropdown)
export const listActiveReferees = query({
  handler: async (ctx) => {
    const coach = await resolveCoachByIdentity(ctx);
    const isAdmin = await hasAdminAccess(ctx);
    if (!coach && !isAdmin) {
      throw new Error("Geen toegang");
    }
    const active = await ctx.db
      .query("referees")
      .withIndex("by_active", (q) => q.eq("active", true))
      .collect();
    return active.map((r) => ({ id: r._id, name: r.name }));
  },
});

// List matches for a team
export const listByTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const coach = await resolveCoachByIdentity(ctx);
    const isAdmin = await hasAdminAccess(ctx);
    if (!isAdmin && (!coach || !coach.teamIds.includes(args.teamId))) {
      throw new Error("Geen toegang");
    }
    return await ctx.db
      .query("matches")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .order("desc")
      .collect();
  },
});

// List team players not yet in this match (for pregame add-player flow)
export const listTeamPlayersNotInMatch = query({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return null;

    const coach = await resolveCoachByIdentity(ctx);
    if (!coach || !coach.teamIds.includes(match.teamId)) return null;

    const inMatch = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();
    const inMatchIds = new Set(inMatch.map((mp) => mp.playerId));

    const allTeam = await ctx.db
      .query("players")
      .withIndex("by_team", (q) => q.eq("teamId", match.teamId))
      .collect();

    return allTeam
      .filter((p) => p.active && !inMatchIds.has(p._id))
      .map((p) => ({ id: p._id, name: p.name, number: p.number }));
  },
});

// Verify coach access and get accessible matches.
export const verifyCoachAccess = query({
  args: {},
  handler: async (ctx) => {
    const coach = await resolveCoachByIdentity(ctx);

    if (!coach) return null;

    const teams = await Promise.all(coach.teamIds.map((id) => ctx.db.get(id)));
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
