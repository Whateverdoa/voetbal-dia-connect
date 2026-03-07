/**
 * Score adjustment mutations for referee (and coach) score editing.
 *
 * Split from matchActions.ts to respect the 300-LOC rule.
 * Re-exported via matchActions for a single public API surface.
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireClockControlAccess } from "./authz";
import { consumeCommandIdempotency } from "./lib/commandIdempotency";
import {
  buildEventGameTimeStamp,
  getEffectiveEventTime,
} from "./lib/matchEventGameTime";

/**
 * Adjust the match score by +1 or -1 for a given team.
 *
 * - Both coach and referee PINs are accepted (verifyClockPin).
 * - When delta is +1, a lightweight "goal" event is always logged.
 *   If scorerNumber is provided, it is stored in the note so coach can enrich later.
 * - Score is clamped to a minimum of 0.
 */
export const adjustScore = mutation({
  args: {
    matchId: v.id("matches"),
    team: v.union(v.literal("home"), v.literal("away")),
    delta: v.union(v.literal(1), v.literal(-1)),
    scorerNumber: v.optional(v.number()),
    scorerPlayerId: v.optional(v.id("players")),
    correlationId: v.string(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    await requireClockControlAccess(ctx, match, "");
    if (!match) throw new Error("Wedstrijd niet gevonden");
    const accepted = await consumeCommandIdempotency(ctx, {
      matchId: args.matchId,
      commandType: "ADJUST_SCORE",
      correlationId: args.correlationId,
    });
    if (!accepted) {
      return { deduped: true };
    }

    // Calculate new score, clamped to 0
    const currentScore =
      args.team === "home" ? match.homeScore : match.awayScore;
    const newScore = Math.max(0, currentScore + args.delta);

    // Patch the correct score field
    if (args.team === "home") {
      await ctx.db.patch(args.matchId, { homeScore: newScore });
    } else {
      await ctx.db.patch(args.matchId, { awayScore: newScore });
    }

    // When incrementing, always log a lightweight goal event.
    // Shirt number stays optional so coach can enrich later.
    if (args.delta === 1) {
      if (args.scorerPlayerId) {
        const scorerInMatch = await ctx.db
          .query("matchPlayers")
          .withIndex("by_match_player", (q) =>
            q.eq("matchId", args.matchId).eq("playerId", args.scorerPlayerId!)
          )
          .first();
        if (!scorerInMatch) {
          throw new Error("Geselecteerde scorer staat niet in deze wedstrijd");
        }
      }

      const isOpponentGoal =
        (args.team === "home" && !match.isHome) ||
        (args.team === "away" && match.isHome);

      const now = Date.now();
      const effectiveEventTime = getEffectiveEventTime(match, now);
      const eventStamp = buildEventGameTimeStamp(match, effectiveEventTime);
      await ctx.db.insert("matchEvents", {
        matchId: args.matchId,
        type: "goal",
        playerId: args.scorerPlayerId,
        quarter: match.currentQuarter,
        matchMs: eventStamp.gameSecond * 1000,
        isOpponentGoal: isOpponentGoal || undefined,
        note:
          args.scorerNumber != null
            ? `Rugnummer: ${args.scorerNumber}`
            : undefined,
        correlationId: args.correlationId,
        commandType: "ADJUST_SCORE",
        timestamp: effectiveEventTime,
        ...eventStamp,
        createdAt: now,
      });
    }
  },
});
