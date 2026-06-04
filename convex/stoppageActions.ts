import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { recordPlayingTime } from "./playingTimeHelpers";
import { verifyClockPin } from "./pinHelpers";
import { fetchRefereeForMatch } from "./refereeHelpers";

export const startStoppage = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Wedstrijd niet gevonden");
    const referee = await fetchRefereeForMatch(ctx, match);
    if (!(await verifyClockPin(ctx, match, undefined, referee))) {
      throw new Error("Geen toegang tot deze wedstrijd");
    }
    if (match.status !== "live") {
      throw new Error("Onderbreking kan alleen tijdens een live wedstrijd");
    }
    if (match.activeStoppageStartedAt != null || match.pausedAt != null) {
      throw new Error("Er loopt al een onderbreking");
    }

    const now = Date.now();
    await ctx.db.patch(args.matchId, { activeStoppageStartedAt: now });
    await ctx.db.insert("matchStoppages", {
      matchId: args.matchId,
      quarter: match.currentQuarter,
      startedAt: now,
      createdAt: now,
    });

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

export const endStoppage = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Wedstrijd niet gevonden");
    const referee = await fetchRefereeForMatch(ctx, match);
    if (!(await verifyClockPin(ctx, match, undefined, referee))) {
      throw new Error("Geen toegang tot deze wedstrijd");
    }
    if (match.status !== "live") {
      throw new Error("Onderbreking kan alleen tijdens een live wedstrijd");
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
      .filter((s) => s.endedAt == null)
      .sort((a, b) => b.startedAt - a.startedAt)[0];

    if (active) {
      await ctx.db.patch(active._id, { endedAt: now });
    }

    await ctx.db.patch(args.matchId, {
      activeStoppageStartedAt: undefined,
      pausedAt: undefined,
      accumulatedPauseTime: undefined,
    });

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
