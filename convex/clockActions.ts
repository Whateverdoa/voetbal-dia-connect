/**
 * Clock pause/resume mutations.
 *
 * Split from matchActions.ts to respect the 300-LOC rule.
 * Re-exported via matchActions for a single public API surface.
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { recordPlayingTime } from "./playingTimeHelpers";
import { verifyClockPin } from "./pinHelpers";
import { fetchRefereeForMatch } from "./refereeHelpers";

/**
 * Pause the match clock mid-quarter.
 * Records playing time for on-field players so the pause gap
 * is never counted towards their playing minutes.
 */
export const pauseClock = mutation({
  args: { matchId: v.id("matches"), pin: v.string() },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }
    const referee = await fetchRefereeForMatch(ctx, match);
    if (!verifyClockPin(match, args.pin, referee)) {
      throw new Error("Invalid match or PIN");
    }

    if (match.status !== "live") {
      throw new Error("Klok kan alleen gepauzeerd worden tijdens een live kwart");
    }
    if (match.pausedAt != null) {
      throw new Error("Klok is al gepauzeerd");
    }

    const now = Date.now();

    await ctx.db.patch(args.matchId, { pausedAt: now });

    // Freeze playing time for all on-field players
    const matchPlayers = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();

    for (const mp of matchPlayers) {
      if (mp.onField && mp.lastSubbedInAt) {
        await recordPlayingTime(ctx, mp, now);
      }
    }
  },
});

/**
 * Resume the match clock after a pause.
 * Adds the pause duration to accumulatedPauseTime and restarts
 * playing-time tracking for on-field players.
 */
export const resumeClock = mutation({
  args: { matchId: v.id("matches"), pin: v.string() },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }
    const referee = await fetchRefereeForMatch(ctx, match);
    if (!verifyClockPin(match, args.pin, referee)) {
      throw new Error("Invalid match or PIN");
    }

    if (match.status !== "live") {
      throw new Error("Klok kan alleen hervat worden tijdens een live kwart");
    }
    if (match.pausedAt == null) {
      throw new Error("Klok is niet gepauzeerd");
    }

    const now = Date.now();
    const pauseDuration = now - match.pausedAt;
    const totalPauseTime = (match.accumulatedPauseTime ?? 0) + pauseDuration;

    await ctx.db.patch(args.matchId, {
      pausedAt: undefined,
      accumulatedPauseTime: totalPauseTime,
    });

    // Restart playing-time tracking for on-field players
    const matchPlayers = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();

    for (const mp of matchPlayers) {
      if (mp.onField) {
        await ctx.db.patch(mp._id, { lastSubbedInAt: now });
      }
    }
  },
});
