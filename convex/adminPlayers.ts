/**
 * Admin operations for players
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdminAccess } from "./adminAuth";

// ============ PLAYERS ============

export const createPlayer = mutation({
  args: {
    teamId: v.id("teams"),
    name: v.string(),
    number: v.optional(v.number()),
    positionPrimary: v.optional(v.string()),
    positionSecondary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);

    return await ctx.db.insert("players", {
      teamId: args.teamId,
      name: args.name,
      number: args.number,
      positionPrimary: args.positionPrimary,
      positionSecondary: args.positionSecondary,
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
      positionPrimary: v.optional(v.string()),
      positionSecondary: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);

    const ids = [];
    for (const p of args.players) {
      const id = await ctx.db.insert("players", {
        teamId: args.teamId,
        name: p.name,
        number: p.number,
        positionPrimary: p.positionPrimary,
        positionSecondary: p.positionSecondary,
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
    teamId: v.optional(v.id("teams")),
    positionPrimary: v.optional(v.string()),
    positionSecondary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    
    const { playerId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(playerId, filtered);
  },
});

/** Ops: search players by name substring (admin). */
export const searchPlayersByName = query({
  args: { q: v.string() },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    const needle = args.q.trim().toLowerCase();
    if (needle.length < 2) return [];
    const all = await ctx.db.query("players").collect();
    return all
      .filter((p) => p.name.toLowerCase().includes(needle))
      .map((p) => ({
        _id: p._id,
        name: p.name,
        teamId: p.teamId,
        active: p.active,
      }));
  },
});

export const deletePlayer = mutation({
  args: { playerId: v.id("players") },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    await ctx.db.delete(args.playerId);
  },
});
