/**
 * Admin operations for players
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { verifyAdminPin } from "./adminAuth";

// ============ PLAYERS ============

export const createPlayer = mutation({
  args: {
    teamId: v.id("teams"),
    name: v.string(),
    number: v.optional(v.number()),
    adminPin: v.string(),
  },
  handler: async (ctx, args) => {
    verifyAdminPin(args.adminPin);
    
    return await ctx.db.insert("players", {
      teamId: args.teamId,
      name: args.name,
      number: args.number,
      active: true,
      createdAt: Date.now(),
    });
  },
});

export const createPlayers = mutation({
  args: {
    teamId: v.id("teams"),
    players: v.array(v.object({
      name: v.string(),
      number: v.optional(v.number()),
    })),
    adminPin: v.string(),
  },
  handler: async (ctx, args) => {
    verifyAdminPin(args.adminPin);
    
    const ids = [];
    for (const p of args.players) {
      const id = await ctx.db.insert("players", {
        teamId: args.teamId,
        name: p.name,
        number: p.number,
        active: true,
        createdAt: Date.now(),
      });
      ids.push(id);
    }
    return ids;
  },
});

export const listPlayersByTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("players")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();
  },
});

export const updatePlayer = mutation({
  args: {
    playerId: v.id("players"),
    name: v.optional(v.string()),
    number: v.optional(v.number()),
    active: v.optional(v.boolean()),
    adminPin: v.string(),
  },
  handler: async (ctx, args) => {
    verifyAdminPin(args.adminPin);
    
    const { playerId, adminPin: _, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(playerId, filtered);
  },
});

export const deletePlayer = mutation({
  args: { 
    playerId: v.id("players"),
    adminPin: v.string(),
  },
  handler: async (ctx, args) => {
    verifyAdminPin(args.adminPin);
    await ctx.db.delete(args.playerId);
  },
});
