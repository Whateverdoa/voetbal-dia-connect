/**
 * Match event mutations - goals, cards, substitutions
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  verifyClockPin,
  verifyIsMatchLead,
} from "./pinHelpers";
import {
  buildEventGameTimeStamp,
  getEffectiveEventTime,
} from "./lib/matchEventGameTime";
import { assistKindValidator } from "./lib/assistKind";
import { applyBenchSubstitutionWithSlotTransfer } from "./lib/benchSubstitutionCore";

// Record a goal
export const addGoal = mutation({
  args: {
    matchId: v.id("matches"),
    correlationId: v.optional(v.string()),
    playerId: v.optional(v.id("players")),
    assistPlayerId: v.optional(v.id("players")),
    assistKind: v.optional(assistKindValidator),
    isOwnGoal: v.optional(v.boolean()),
    isOpponentGoal: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }
    if (!(await verifyClockPin(ctx, match))) {
      throw new Error("Geen toegang tot deze wedstrijd");
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

    const now = Date.now();
    const effectiveEventTime = getEffectiveEventTime(match, now);
    const goalStamp = buildEventGameTimeStamp(match, effectiveEventTime);

    // Log goal event
    await ctx.db.insert("matchEvents", {
      matchId: args.matchId,
      type: "goal",
      playerId: args.playerId,
      relatedPlayerId: args.assistPlayerId,
      assistKind: args.assistKind,
      quarter: match.currentQuarter,
      matchMs: goalStamp.gameSecond * 1000,
      isOwnGoal: args.isOwnGoal,
      isOpponentGoal: args.isOpponentGoal,
      correlationId: args.correlationId,
      commandType: "ADD_GOAL",
      timestamp: effectiveEventTime,
      ...goalStamp,
      createdAt: now,
    });

    // Log assist if provided
    if (args.assistPlayerId && !args.isOpponentGoal && !args.isOwnGoal) {
      const assistStamp = buildEventGameTimeStamp(match, effectiveEventTime);
      await ctx.db.insert("matchEvents", {
        matchId: args.matchId,
        type: "assist",
        playerId: args.assistPlayerId,
        relatedPlayerId: args.playerId,
        assistKind: args.assistKind,
        quarter: match.currentQuarter,
        matchMs: assistStamp.gameSecond * 1000,
        correlationId: args.correlationId,
        commandType: "ADD_GOAL",
        timestamp: effectiveEventTime,
        ...assistStamp,
        createdAt: now,
      });
    }
  },
});

// Substitution — only the lead coach may execute
export const substitute = mutation({
  args: {
    matchId: v.id("matches"),
    correlationId: v.optional(v.string()),
    playerOutId: v.id("players"),
    playerInId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }
    if (!(await verifyIsMatchLead(ctx, match))) {
      throw new Error("Alleen de wedstrijdleider mag wissels uitvoeren");
    }

    await applyBenchSubstitutionWithSlotTransfer(ctx, {
      matchId: args.matchId,
      playerOutId: args.playerOutId,
      playerInId: args.playerInId,
      correlationId: args.correlationId,
      commandType: "SUBSTITUTE",
    });
  },
});

// Remove the most recent goal for a match (undo)
export const removeLastGoal = mutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }
    if (!(await verifyClockPin(ctx, match))) {
      throw new Error("Geen toegang tot deze wedstrijd");
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
