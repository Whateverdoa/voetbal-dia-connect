/**
 * Coach-specific queries and misc queries re-exported via matches.ts.
 *
 * Split from matches.ts to respect the 300-LOC rule.
 */
import { query } from "./_generated/server";
import { v } from "convex/values";

// List active referees (for coach assignment dropdown)
export const listActiveReferees = query({
  handler: async (ctx) => {
    const all = await ctx.db.query("referees").collect();
    return all
      .filter((r) => r.active)
      .map((r) => ({ id: r._id, name: r.name }));
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
