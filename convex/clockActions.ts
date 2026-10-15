import { assertLegacyOfficialWrite } from "./lib/refereeMatchPolicy";
/**
 * Legacy clock pause/resume mutations.
 *
 * These names remain exported for backwards compatibility, but they now record
 * a stoppage for extra-time advice instead of pausing the visible match clock.
 */
import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { recordPlayingTime } from "./playingTimeHelpers";
import { verifyClockPin } from "./pinHelpers";
import { fetchRefereeForMatch } from "./refereeHelpers";

/**
 * Start an interruption. The main match clock keeps running, while player
 * minutes freeze and the duration counts toward advisory extra time.
 */
export const pauseClock = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (match) assertLegacyOfficialWrite(match);
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }
    const referee = await fetchRefereeForMatch(ctx, match);
    if (!(await verifyClockPin(ctx, match, undefined, referee))) {
      throw new Error("Geen toegang tot deze wedstrijd");
    }

    if (match.status !== "live") {
      throw new Error("Klok kan alleen gepauzeerd worden tijdens een live kwart");
    }
    if (match.activeStoppageStartedAt != null || match.pausedAt != null) {
      throw new Error("Er loopt al een onderbreking");
    }

    const now = Date.now();

    await ctx.db.patch(args.matchId, {
      activeStoppageStartedAt: now,
      pausedAt: undefined,
    });
    await ctx.db.insert("matchStoppages", {
      matchId: args.matchId,
      quarter: match.currentQuarter,
      startedAt: now,
      createdAt: now,
    });

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
 * End an interruption and restart playing-time tracking for on-field players.
 */
export const resumeClock = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (match) assertLegacyOfficialWrite(match);
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }
    const referee = await fetchRefereeForMatch(ctx, match);
    if (!(await verifyClockPin(ctx, match, undefined, referee))) {
      throw new Error("Geen toegang tot deze wedstrijd");
    }

    if (match.status !== "live") {
      throw new Error("Klok kan alleen hervat worden tijdens een live kwart");
    }
    if (match.activeStoppageStartedAt == null && match.pausedAt == null) {
      throw new Error("Er loopt geen onderbreking");
    }

    const now = Date.now();
    const stoppages = await ctx.db
      .query("matchStoppages")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();
    const active = stoppages
      .filter((stoppage) => stoppage.endedAt == null)
      .sort((a, b) => b.startedAt - a.startedAt)[0];
    if (active) {
      await ctx.db.patch(active._id, { endedAt: now });
    }

    await ctx.db.patch(args.matchId, {
      pausedAt: undefined,
      accumulatedPauseTime: undefined,
      activeStoppageStartedAt: undefined,
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

export const clearLegacyPausedClockState = internalMutation({
  args: {},
  handler: async (ctx) => {
    const liveMatches = await ctx.db
      .query("matches")
      .withIndex("by_status", (q) => q.eq("status", "live"))
      .collect();

    let updated = 0;
    for (const match of liveMatches) {
      if (match.refereePolicy) continue;
      if (match.pausedAt == null && match.accumulatedPauseTime == null) continue;

      await ctx.db.patch(match._id, {
        pausedAt: undefined,
        accumulatedPauseTime: undefined,
      });
      updated++;
    }

    return { updated };
  },
});
