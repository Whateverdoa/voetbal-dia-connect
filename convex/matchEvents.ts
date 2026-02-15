/**
 * Match event mutations - goals, cards, substitutions
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { recordPlayingTime, startPlayingTime } from "./playingTimeHelpers";
import { verifyCoachTeamMembership } from "./pinHelpers";

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
    if (!match) {
      throw new Error("Invalid match or PIN");
    }
    if (!(await verifyCoachTeamMembership(ctx, match, args.pin))) {
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
    if (!match) {
      throw new Error("Invalid match or PIN");
    }
    if (!(await verifyCoachTeamMembership(ctx, match, args.pin))) {
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

// Remove the most recent goal for a match (undo)
export const removeLastGoal = mutation({
  args: {
    matchId: v.id("matches"),
    pin: v.string(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Invalid match or PIN");
    }
    if (!(await verifyCoachTeamMembership(ctx, match, args.pin))) {
      throw new Error("Invalid match or PIN");
    }

    // Find most recent goal event for this match, ordered by timestamp desc
    const goalEvents = await ctx.db
      .query("matchEvents")
      .withIndex("by_match_type", (q) =>
        q.eq("matchId", args.matchId).eq("type", "goal")
      )
      .collect();

    if (goalEvents.length === 0) {
      throw new Error("Geen doelpunten om ongedaan te maken");
    }

    // Get the most recent goal by timestamp
    const lastGoal = goalEvents.reduce((latest, event) =>
      event.timestamp > latest.timestamp ? event : latest
    );

    // Reverse the score change
    if (lastGoal.isOpponentGoal) {
      if (match.isHome) {
        await ctx.db.patch(args.matchId, {
          awayScore: Math.max(0, match.awayScore - 1),
        });
      } else {
        await ctx.db.patch(args.matchId, {
          homeScore: Math.max(0, match.homeScore - 1),
        });
      }
    } else {
      if (match.isHome) {
        await ctx.db.patch(args.matchId, {
          homeScore: Math.max(0, match.homeScore - 1),
        });
      } else {
        await ctx.db.patch(args.matchId, {
          awayScore: Math.max(0, match.awayScore - 1),
        });
      }
    }

    // Delete associated assist event if one exists
    if (lastGoal.playerId && !lastGoal.isOpponentGoal && !lastGoal.isOwnGoal) {
      const assistEvents = await ctx.db
        .query("matchEvents")
        .withIndex("by_match_type", (q) =>
          q.eq("matchId", args.matchId).eq("type", "assist")
        )
        .collect();

      // Find assist linked to this goal (same relatedPlayerId = goal scorer)
      const linkedAssist = assistEvents.find(
        (e) =>
          e.relatedPlayerId === lastGoal.playerId &&
          Math.abs(e.timestamp - lastGoal.timestamp) < 1000
      );

      if (linkedAssist) {
        await ctx.db.delete(linkedAssist._id);
      }
    }

    // Delete the goal event
    await ctx.db.delete(lastGoal._id);

    return {
      removedGoal: {
        isOpponentGoal: lastGoal.isOpponentGoal ?? false,
        isOwnGoal: lastGoal.isOwnGoal ?? false,
        playerId: lastGoal.playerId ?? null,
        quarter: lastGoal.quarter,
      },
    };
  },
});
