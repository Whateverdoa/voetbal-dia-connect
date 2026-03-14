import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdminAccess } from "./adminAuth";

/**
 * Add an existing team player to a scheduled match. Admin only.
 */
export const addPlayerToMatch = mutation({
  args: {
    matchId: v.id("matches"),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);

    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Wedstrijd niet gevonden");
    if (match.status !== "scheduled") {
      throw new Error("Spelers kunnen alleen worden toegevoegd vóór de aftrap");
    }

    const player = await ctx.db.get(args.playerId);
    if (!player || player.teamId !== match.teamId) {
      throw new Error("Speler niet gevonden of hoort niet bij dit team");
    }

    const existing = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", args.matchId).eq("playerId", args.playerId)
      )
      .first();
    if (existing) throw new Error("Speler staat al in de wedstrijd");

    await ctx.db.insert("matchPlayers", {
      matchId: args.matchId,
      playerId: args.playerId,
      isKeeper: false,
      onField: false,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Create a new player and add to a scheduled match. Admin only.
 */
export const createPlayerAndAddToMatch = mutation({
  args: {
    matchId: v.id("matches"),
    name: v.string(),
    number: v.optional(v.number()),
    positionPrimary: v.optional(v.string()),
    positionSecondary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);

    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Wedstrijd niet gevonden");
    if (match.status !== "scheduled") {
      throw new Error("Spelers kunnen alleen worden toegevoegd vóór de aftrap");
    }

    const trimmed = args.name.trim();
    if (!trimmed) throw new Error("Naam is verplicht");

    const playerId = await ctx.db.insert("players", {
      teamId: match.teamId,
      name: trimmed,
      number: args.number,
      positionPrimary: args.positionPrimary,
      positionSecondary: args.positionSecondary,
      active: true,
      createdAt: Date.now(),
    });

    await ctx.db.insert("matchPlayers", {
      matchId: args.matchId,
      playerId,
      isKeeper: false,
      onField: false,
      createdAt: Date.now(),
    });

    return { playerId };
  },
});

export const deleteMatch = mutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);

    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }

    if (!["scheduled", "finished"].includes(match.status)) {
      throw new Error("Kan alleen geplande of afgelopen wedstrijden verwijderen");
    }

    const matchPlayers = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();
    await Promise.all(matchPlayers.map((mp) => ctx.db.delete(mp._id)));

    const matchEvents = await ctx.db
      .query("matchEvents")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();
    await Promise.all(matchEvents.map((ev) => ctx.db.delete(ev._id)));

    await ctx.db.delete(args.matchId);
    return { deleted: true };
  },
});
