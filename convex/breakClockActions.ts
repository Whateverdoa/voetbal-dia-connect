import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { recordPlayingTime } from "./playingTimeHelpers";
import { verifyClockPin } from "./pinHelpers";
import { fetchRefereeForMatch } from "./refereeHelpers";
import { buildEventGameTimeStamp } from "./lib/matchEventGameTime";

export const configureBreakClock = mutation({
  args: {
    matchId: v.id("matches"),
    useBreakClock: v.boolean(),
    breakClockAutoStart: v.boolean(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Wedstrijd niet gevonden");
    const referee = await fetchRefereeForMatch(ctx, match);
    if (!(await verifyClockPin(ctx, match, undefined, referee))) {
      throw new Error("Geen toegang tot deze wedstrijd");
    }
    if (match.status === "live" || match.status === "finished") {
      throw new Error("Rustklok kan niet tijdens of na de wedstrijd aangepast worden");
    }

    await ctx.db.patch(args.matchId, {
      useBreakClock: args.useBreakClock,
      breakClockAutoStart: args.breakClockAutoStart,
    });
  },
});

export const autoResumeFromBreak = internalMutation({
  args: {
    matchId: v.id("matches"),
    expectedBreakEndAt: v.number(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) return;
    if (match.status !== "halftime") return;
    if (match.scheduledBreakEndAt !== args.expectedBreakEndAt) return;
    if (match.breakClockAutoStart === false) return;

    const now = Date.now();

    await ctx.db.patch(args.matchId, {
      status: "live",
      quarterStartedAt: now,
      pausedAt: undefined,
      accumulatedPauseTime: 0,
      frozenClockMs: undefined,
      activeStoppageStartedAt: undefined,
      halftimeStartedAt: undefined,
      scheduledBreakEndAt: undefined,
    });

    const matchPlayers = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();

    for (const mp of matchPlayers) {
      if (mp.onField) {
        await ctx.db.patch(mp._id, { lastSubbedInAt: now });
      } else if (mp.lastSubbedInAt) {
        await recordPlayingTime(ctx, mp, now);
      }
    }

    const quarterStartStamp = buildEventGameTimeStamp(
      {
        ...match,
        quarterStartedAt: now,
        pausedAt: undefined,
        accumulatedPauseTime: 0,
      },
      now
    );

    await ctx.db.insert("matchEvents", {
      matchId: args.matchId,
      type: "quarter_start",
      quarter: match.currentQuarter,
      matchMs: quarterStartStamp.gameSecond * 1000,
      commandType: "AUTO_RESUME_FROM_BREAK",
      timestamp: now,
      ...quarterStartStamp,
      createdAt: now,
    });
  },
});
