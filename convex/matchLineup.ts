/**
 * Match lineup mutations - toggle player/keeper status
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { recordPlayingTime, startPlayingTime } from "./playingTimeHelpers";
import { verifyCoachTeamMembership } from "./pinHelpers";

// Toggle player on/off field
export const togglePlayerOnField = mutation({
  args: {
    matchId: v.id("matches"),
    pin: v.string(),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Invalid match or PIN");
    }
    if (!(await verifyCoachTeamMembership(ctx, match, args.pin))) {
      throw new Error("Invalid match or PIN");
    }

    const now = Date.now();

    const mp = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", args.matchId).eq("playerId", args.playerId)
      )
      .first();

    if (mp) {
      if (mp.onField) {
        // Going OFF field - record playing time (only if match is live)
        if (match.status === "live" && mp.lastSubbedInAt) {
          await recordPlayingTime(ctx, mp, now);
        }
        await ctx.db.patch(mp._id, {
          onField: false,
          lastSubbedInAt: undefined,
          fieldSlotIndex: undefined,
        });
      } else {
        // Going ON field - start tracking time (only if match is live)
        if (match.status === "live") {
          await startPlayingTime(ctx, mp._id, now);
        } else {
          await ctx.db.patch(mp._id, { onField: true });
        }
      }
    }
  },
});

// Toggle keeper status
export const toggleKeeper = mutation({
  args: {
    matchId: v.id("matches"),
    pin: v.string(),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Invalid match or PIN");
    }
    if (!(await verifyCoachTeamMembership(ctx, match, args.pin))) {
      throw new Error("Invalid match or PIN");
    }

    const mp = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", args.matchId).eq("playerId", args.playerId)
      )
      .first();

    if (mp) {
      // Remove keeper from others first
      const allMps = await ctx.db
        .query("matchPlayers")
        .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
        .collect();
      
      for (const other of allMps) {
        if (other.isKeeper && other._id !== mp._id) {
          await ctx.db.patch(other._id, { isKeeper: false });
        }
      }

      await ctx.db.patch(mp._id, { isKeeper: !mp.isKeeper });
    }
  },
});

// Assign player to a field slot (field view). Clears slot from previous occupant.
export const assignPlayerToSlot = mutation({
  args: {
    matchId: v.id("matches"),
    pin: v.string(),
    playerId: v.id("players"),
    fieldSlotIndex: v.number(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match || match.coachPin !== args.pin) {
      throw new Error("Invalid match or PIN");
    }

    const mp = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", args.matchId).eq("playerId", args.playerId)
      )
      .first();
    if (!mp) throw new Error("Player not in this match");

    const now = Date.now();
    const allMps = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();

    // Clear this slot from whoever had it
    for (const other of allMps) {
      if (other.fieldSlotIndex === args.fieldSlotIndex && other._id !== mp._id) {
        await ctx.db.patch(other._id, { fieldSlotIndex: undefined });
      }
    }

    const updates: { onField: boolean; fieldSlotIndex: number } = {
      onField: true,
      fieldSlotIndex: args.fieldSlotIndex,
    };
    if (!mp.onField && match.status === "live") {
      await startPlayingTime(ctx, mp._id, now);
    }
    await ctx.db.patch(mp._id, updates);
  },
});

// Swap field positions of two on-field players (exchange their fieldSlotIndex)
export const swapFieldPositions = mutation({
  args: {
    matchId: v.id("matches"),
    pin: v.string(),
    playerAId: v.id("players"),
    playerBId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match || match.coachPin !== args.pin) {
      throw new Error("Invalid match or PIN");
    }

    const mpA = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", args.matchId).eq("playerId", args.playerAId)
      )
      .first();
    const mpB = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", args.matchId).eq("playerId", args.playerBId)
      )
      .first();

    if (!mpA || !mpB) throw new Error("Player not in this match");
    if (!mpA.onField || !mpB.onField) throw new Error("Both players must be on field");

    const slotA = mpA.fieldSlotIndex;
    const slotB = mpB.fieldSlotIndex;
    await ctx.db.patch(mpA._id, { fieldSlotIndex: slotB });
    await ctx.db.patch(mpB._id, { fieldSlotIndex: slotA });
  },
});

// Set match formation and/or pitch type (field view)
export const setMatchFormation = mutation({
  args: {
    matchId: v.id("matches"),
    pin: v.string(),
    formationId: v.optional(v.string()),
    pitchType: v.optional(v.union(v.literal("full"), v.literal("half"))),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match || match.coachPin !== args.pin) {
      throw new Error("Invalid match or PIN");
    }
    const updates: { formationId?: string; pitchType?: "full" | "half" } = {};
    if (args.formationId !== undefined) updates.formationId = args.formationId;
    if (args.pitchType !== undefined) updates.pitchType = args.pitchType;
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.matchId, updates);
    }
  },
});

// Toggle public lineup visibility
export const toggleShowLineup = mutation({
  args: { matchId: v.id("matches"), pin: v.string() },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Invalid match or PIN");
    }
    if (!(await verifyCoachTeamMembership(ctx, match, args.pin))) {
      throw new Error("Invalid match or PIN");
    }

    await ctx.db.patch(args.matchId, { showLineup: !match.showLineup });
  },
});
