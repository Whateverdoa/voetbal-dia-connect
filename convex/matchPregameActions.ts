/**
 * Match pregame mutations - metadata and player assignment
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { verifyCoachTeamMembership } from "./pinHelpers";

/**
 * Create a new player in the team roster and add them to a scheduled match.
 * Allowed only when match status is "scheduled". Any team coach may perform this.
 */
export const createPlayerAndAddToMatch = mutation({
  args: {
    matchId: v.id("matches"),
    pin: v.string(),
    name: v.string(),
    number: v.optional(v.number()),
    positionPrimary: v.optional(v.string()),
    positionSecondary: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }
    if (match.status !== "scheduled") {
      throw new Error("Spelers kunnen alleen worden toegevoegd vóór de aftrap");
    }
    if (!(await verifyCoachTeamMembership(ctx, match, args.pin))) {
      throw new Error("Invalid match or PIN");
    }

    const trimmedName = args.name.trim();
    if (!trimmedName) {
      throw new Error("Naam is verplicht");
    }

    const playerId = await ctx.db.insert("players", {
      teamId: match.teamId,
      name: trimmedName,
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

/**
 * Add an existing team player to a scheduled match.
 * Allowed only when match status is "scheduled". Any team coach may perform this.
 */
export const addExistingPlayerToMatch = mutation({
  args: {
    matchId: v.id("matches"),
    pin: v.string(),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }
    if (match.status !== "scheduled") {
      throw new Error("Spelers kunnen alleen worden toegevoegd vóór de aftrap");
    }
    if (!(await verifyCoachTeamMembership(ctx, match, args.pin))) {
      throw new Error("Invalid match or PIN");
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

    if (existing) {
      throw new Error("Speler staat al in de wedstrijd");
    }

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
 * Update match metadata (opponent, scheduledAt, isHome).
 * Allowed only while match status is "scheduled".
 * Any coach belonging to the match's team may edit.
 */
export const updateMatchMetadata = mutation({
  args: {
    matchId: v.id("matches"),
    pin: v.string(),
    opponent: v.optional(v.string()),
    scheduledAt: v.optional(v.number()),
    isHome: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }
    if (match.status !== "scheduled") {
      throw new Error("Wedstrijdgegevens kunnen alleen worden gewijzigd vóór de aftrap");
    }
    if (!(await verifyCoachTeamMembership(ctx, match, args.pin))) {
      throw new Error("Invalid match or PIN");
    }

    const patch: { opponent?: string; scheduledAt?: number; isHome?: boolean } = {};
    if (args.opponent !== undefined) {
      const trimmed = args.opponent.trim();
      if (!trimmed) throw new Error("Tegenstander mag niet leeg zijn");
      patch.opponent = trimmed;
    }
    if (args.scheduledAt !== undefined) patch.scheduledAt = args.scheduledAt;
    if (args.isHome !== undefined) patch.isHome = args.isHome;

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(args.matchId, patch);
    }

    return { success: true };
  },
});

// Update match status
export const updateStatus = mutation({
  args: {
    matchId: v.id("matches"),
    pin: v.string(),
    status: v.union(
      v.literal("scheduled"),
      v.literal("lineup"),
      v.literal("live"),
      v.literal("halftime"),
      v.literal("finished")
    ),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Invalid match or PIN");
    }
    const coach = await verifyCoachTeamMembership(ctx, match, args.pin);
    if (!coach) {
      throw new Error("Invalid match or PIN");
    }

    await ctx.db.patch(args.matchId, { status: args.status });
  },
});
