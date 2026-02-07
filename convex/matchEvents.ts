/**
 * Match event mutations - goals, cards, substitutions
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
import { MutationCtx } from "./_generated/server";

// Helper: Calculate minutes played and update matchPlayer
async function recordPlayingTime(
  ctx: MutationCtx,
  matchPlayer: Doc<"matchPlayers">,
  endTime: number
): Promise<void> {
  if (!matchPlayer.lastSubbedInAt) return;
  
  const minutesThisSession = (endTime - matchPlayer.lastSubbedInAt) / 60000;
  const totalMinutes = (matchPlayer.minutesPlayed ?? 0) + minutesThisSession;
  
  await ctx.db.patch(matchPlayer._id, {
    minutesPlayed: Math.round(totalMinutes * 10) / 10, // Round to 1 decimal
    lastSubbedInAt: undefined, // Clear the timestamp
  });
}

// Helper: Set player as on field and record start time
async function startPlayingTime(
  ctx: MutationCtx,
  matchPlayerId: Id<"matchPlayers">,
  startTime: number
): Promise<void> {
  await ctx.db.patch(matchPlayerId, {
    onField: true,
    lastSubbedInAt: startTime,
  });
}

// Record a goal
export const addGoal = mutation({
  args: {
    matchId: v.id("matches"),
    pin: v.string(),
    playerId: v.optional(v.id("players")),
    assistPlayerId: v.optional(v.id("players")),
    isOwnGoal: v.optional(v.boolean()),
    isOpponentGoal: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match || match.coachPin !== args.pin) {
      throw new Error("Invalid match or PIN");
    }

    // Update score
    if (args.isOpponentGoal) {
      if (match.isHome) {
        await ctx.db.patch(args.matchId, { awayScore: match.awayScore + 1 });
      } else {
        await ctx.db.patch(args.matchId, { homeScore: match.homeScore + 1 });
      }
    } else {
      if (match.isHome) {
        await ctx.db.patch(args.matchId, { homeScore: match.homeScore + 1 });
      } else {
        await ctx.db.patch(args.matchId, { awayScore: match.awayScore + 1 });
      }
    }

    // Log goal event
    await ctx.db.insert("matchEvents", {
      matchId: args.matchId,
      type: "goal",
      playerId: args.playerId,
      relatedPlayerId: args.assistPlayerId,
      quarter: match.currentQuarter,
      isOwnGoal: args.isOwnGoal,
      isOpponentGoal: args.isOpponentGoal,
      timestamp: Date.now(),
      createdAt: Date.now(),
    });

    // Log assist if provided
    if (args.assistPlayerId && !args.isOpponentGoal && !args.isOwnGoal) {
      await ctx.db.insert("matchEvents", {
        matchId: args.matchId,
        type: "assist",
        playerId: args.assistPlayerId,
        relatedPlayerId: args.playerId,
        quarter: match.currentQuarter,
        timestamp: Date.now(),
        createdAt: Date.now(),
      });
    }
  },
});

// Substitution
export const substitute = mutation({
  args: {
    matchId: v.id("matches"),
    pin: v.string(),
    playerOutId: v.id("players"),
    playerInId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match || match.coachPin !== args.pin) {
      throw new Error("Invalid match or PIN");
    }

    const now = Date.now();

    // Find match players
    const mpOut = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", args.matchId).eq("playerId", args.playerOutId)
      )
      .first();

    const mpIn = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", args.matchId).eq("playerId", args.playerInId)
      )
      .first();

    // Player going OFF - record their playing time
    if (mpOut) {
      if (mpOut.lastSubbedInAt) {
        await recordPlayingTime(ctx, mpOut, now);
      }
      await ctx.db.patch(mpOut._id, { onField: false, lastSubbedInAt: undefined });
    }

    // Player going ON - start tracking their time
    if (mpIn) {
      await startPlayingTime(ctx, mpIn._id, now);
    }

    // Log events
    await ctx.db.insert("matchEvents", {
      matchId: args.matchId,
      type: "sub_out",
      playerId: args.playerOutId,
      relatedPlayerId: args.playerInId,
      quarter: match.currentQuarter,
      timestamp: now,
      createdAt: now,
    });

    await ctx.db.insert("matchEvents", {
      matchId: args.matchId,
      type: "sub_in",
      playerId: args.playerInId,
      relatedPlayerId: args.playerOutId,
      quarter: match.currentQuarter,
      timestamp: now,
      createdAt: now,
    });
  },
});
