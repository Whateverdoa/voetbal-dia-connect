/**
 * Admin operations for clubs
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdminAccess } from "./adminAuth";

// ============ CLUBS ============

export const createClub = mutation({
  args: { 
    name: v.string(), 
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    
    return await ctx.db.insert("clubs", {
      name: args.name,
      slug: args.slug.toLowerCase(),
      createdAt: Date.now(),
    });
  },
});

export const getClubBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("clubs")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug.toLowerCase()))
      .first();
  },
});

export const listClubs = query({
  handler: async (ctx) => {
    return await ctx.db.query("clubs").collect();
  },
});

export const updateClub = mutation({
  args: {
    clubId: v.id("clubs"),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    
    const { clubId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    if (filtered.slug) {
      filtered.slug = (filtered.slug as string).toLowerCase();
    }
    await ctx.db.patch(clubId, filtered);
  },
});

export const deleteClub = mutation({
  args: { 
    clubId: v.id("clubs"),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    
    // Delete all teams in club first
    const teams = await ctx.db
      .query("teams")
      .withIndex("by_club", (q) => q.eq("clubId", args.clubId))
      .collect();
    
    for (const team of teams) {
      // Delete players in team
      const players = await ctx.db
        .query("players")
        .withIndex("by_team", (q) => q.eq("teamId", team._id))
        .collect();
      for (const player of players) {
        await ctx.db.delete(player._id);
      }
      await ctx.db.delete(team._id);
    }
    
    await ctx.db.delete(args.clubId);
  },
});
