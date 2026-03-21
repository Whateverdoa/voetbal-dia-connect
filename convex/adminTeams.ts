/**
 * Admin operations for teams
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdminAccess } from "./adminAuth";

// ============ TEAMS ============

export const createTeam = mutation({
  args: { 
    clubId: v.id("clubs"), 
    name: v.string(), 
    slug: v.string(),
    logoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    
    return await ctx.db.insert("teams", {
      clubId: args.clubId,
      name: args.name,
      slug: args.slug.toLowerCase(),
      logoUrl: args.logoUrl,
      createdAt: Date.now(),
    });
  },
});

export const listTeamsByClub = query({
  args: { clubId: v.id("clubs") },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    return await ctx.db
      .query("teams")
      .withIndex("by_club", (q) => q.eq("clubId", args.clubId))
      .collect();
  },
});

export const getTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.teamId);
  },
});

export const listAllTeams = query({
  handler: async (ctx) => {
    await requireAdminAccess(ctx);
    const teams = await ctx.db.query("teams").collect();
    // Enrich with club name
    return await Promise.all(
      teams.map(async (t) => {
        const club = await ctx.db.get(t.clubId);
        return {
          ...t,
          clubName: club?.name ?? "Unknown",
        };
      })
    );
  },
});

export const updateTeam = mutation({
  args: {
    teamId: v.id("teams"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    
    const { teamId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    if (filtered.slug) {
      filtered.slug = (filtered.slug as string).toLowerCase();
    }
    await ctx.db.patch(teamId, filtered);
  },
});

export const deleteTeam = mutation({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    
    // Delete all players in team
    const players = await ctx.db
      .query("players")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
    for (const player of players) {
      await ctx.db.delete(player._id);
    }
    
    // Remove team from coaches
    const coaches = await ctx.db.query("coaches").collect();
    for (const coach of coaches) {
      if (coach.teamIds.includes(args.teamId)) {
        await ctx.db.patch(coach._id, {
          teamIds: coach.teamIds.filter((id) => id !== args.teamId),
        });
      }
    }
    
    // Delete the team
    await ctx.db.delete(args.teamId);
  },
});
