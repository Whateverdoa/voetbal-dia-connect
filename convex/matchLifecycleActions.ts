/**
 * Match lifecycle mutations - create, start, quarters
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { recordPlayingTime } from "./playingTimeHelpers";
import { verifyClockPin } from "./pinHelpers";
import { fetchRefereeForMatch } from "./refereeHelpers";
import { generatePublicCode, MAX_CODE_GENERATION_ATTEMPTS } from "./helpers";
import { requireCoachForTeam } from "./lib/userAccess";
import { assertValidMatchTiming } from "./lib/matchTiming";
import {
  buildEventGameTimeStamp,
  computeQuarterOverrunSeconds,
  computeVisibleClockMs,
  getEffectiveEventTime,
} from "./lib/matchEventGameTime";
import { getBreakMinutesAfterQuarter } from "./lib/matchBreaks";
import { internal } from "./_generated/api";

// Create a new match
export const create = mutation({
  args: {
    teamId: v.id("teams"),
    opponent: v.string(),
    isHome: v.boolean(),
    quarterCount: v.optional(v.number()),
    regulationDurationMinutes: v.optional(v.number()),
    scheduledAt: v.optional(v.number()),
    playerIds: v.array(v.id("players")),
  },
  handler: async (ctx, args) => {
    const { coach } = await requireCoachForTeam(ctx, args.teamId);

    const trimmedOpponent = args.opponent.trim();
    if (!trimmedOpponent) {
      throw new Error("Tegenstander is verplicht");
    }
    if (args.playerIds.length === 0) {
      throw new Error("Selecteer minimaal één speler");
    }

    let publicCode = generatePublicCode();
    let attempts = 1;
    let existing = await ctx.db
      .query("matches")
      .withIndex("by_code", (q) => q.eq("publicCode", publicCode))
      .first();

    while (existing) {
      if (attempts >= MAX_CODE_GENERATION_ATTEMPTS) {
        throw new Error("Kon geen unieke wedstrijdcode genereren. Probeer het later opnieuw.");
      }
      publicCode = generatePublicCode();
      attempts++;
      existing = await ctx.db
        .query("matches")
        .withIndex("by_code", (q) => q.eq("publicCode", publicCode))
        .first();
    }

    const quarterCount = args.quarterCount ?? 4;
    const regulationMinutes = args.regulationDurationMinutes ?? 60;
    assertValidMatchTiming(quarterCount, regulationMinutes);
    const matchId = await ctx.db.insert("matches", {
      teamId: args.teamId,
      publicCode,
      coachId: coach._id,
      opponent: trimmedOpponent,
      isHome: args.isHome,
      scheduledAt: args.scheduledAt,
      status: "scheduled",
      currentQuarter: 1,
      quarterCount,
      ...(regulationMinutes !== 60
        ? { regulationDurationMinutes: regulationMinutes }
        : {}),
      homeScore: 0,
      awayScore: 0,
      showLineup: false,
      useBreakClock: true,
      breakClockAutoStart: true,
      createdAt: Date.now(),
    });

    for (const playerId of args.playerIds) {
      await ctx.db.insert("matchPlayers", {
        matchId,
        playerId,
        isKeeper: false,
        onField: false,
        createdAt: Date.now(),
      });
    }

    return { matchId, publicCode };
  },
});

// Start the match
export const start = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Wedstrijd niet gevonden");
    const referee = await fetchRefereeForMatch(ctx, match);
    if (!(await verifyClockPin(ctx, match, undefined, referee))) {
      throw new Error("Geen toegang tot deze wedstrijd");
    }

    const now = Date.now();

    await ctx.db.patch(args.matchId, {
      status: "live",
      currentQuarter: 1,
      startedAt: now,
      quarterStartedAt: now,
      pausedAt: undefined,
      accumulatedPauseTime: 0,
      bankedOverrunSeconds: 0,
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
      }
    }

    const quarterStartStamp = buildEventGameTimeStamp(
      {
        ...match,
        currentQuarter: 1,
        quarterStartedAt: now,
        pausedAt: undefined,
        accumulatedPauseTime: 0,
        bankedOverrunSeconds: 0,
      },
      now
    );

    await ctx.db.insert("matchEvents", {
      matchId: args.matchId,
      type: "quarter_start",
      quarter: 1,
      matchMs: quarterStartStamp.gameSecond * 1000,
      commandType: "START_MATCH",
      timestamp: now,
      ...quarterStartStamp,
      createdAt: now,
    });
  },
});

// End current quarter / start next
export const nextQuarter = mutation({
  args: {
    matchId: v.id("matches"),
    correlationId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Wedstrijd niet gevonden");
    const referee = await fetchRefereeForMatch(ctx, match);
    if (!(await verifyClockPin(ctx, match, undefined, referee))) {
      throw new Error("Geen toegang tot deze wedstrijd");
    }

    const now = Date.now();
    const nextQ = match.currentQuarter + 1;
    const effectiveEndTime = getEffectiveEventTime(match, now);
    const quarterOverrunSeconds = computeQuarterOverrunSeconds(
      match,
      effectiveEndTime
    );
    const nextBankedOverrunSeconds =
      (match.bankedOverrunSeconds ?? 0) + quarterOverrunSeconds;

    const matchPlayers = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();

    for (const mp of matchPlayers) {
      if (mp.onField && mp.lastSubbedInAt) {
        await recordPlayingTime(ctx, mp, effectiveEndTime);
      }
    }

    if (match.activeStoppageStartedAt != null) {
      const stoppages = await ctx.db
        .query("matchStoppages")
        .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
        .collect();
      const active = stoppages
        .filter((stoppage) => stoppage.endedAt == null)
        .sort((a, b) => b.startedAt - a.startedAt)[0];
      if (active) {
        await ctx.db.patch(active._id, { endedAt: effectiveEndTime });
      }
    }

    const quarterEndStamp = buildEventGameTimeStamp(match, effectiveEndTime);
    const frozenClockMs = computeVisibleClockMs(match, effectiveEndTime);

    await ctx.db.insert("matchEvents", {
      matchId: args.matchId,
      type: "quarter_end",
      quarter: match.currentQuarter,
      matchMs: quarterEndStamp.gameSecond * 1000,
      correlationId: args.correlationId,
      commandType: "NEXT_QUARTER",
      timestamp: effectiveEndTime,
      ...quarterEndStamp,
      createdAt: now,
    });

    if (nextQ > match.quarterCount) {
      await ctx.db.patch(args.matchId, {
        status: "finished",
        quarterStartedAt: undefined,
        pausedAt: undefined,
        accumulatedPauseTime: undefined,
        bankedOverrunSeconds: nextBankedOverrunSeconds,
        frozenClockMs,
        activeStoppageStartedAt: undefined,
        halftimeStartedAt: undefined,
        scheduledBreakEndAt: undefined,
        finishedAt: now,
      });
      return;
    }

    const breakMinutes = getBreakMinutesAfterQuarter(match, match.currentQuarter);
    const halftimeStartedAt = now;
    const scheduledBreakEndAt =
      breakMinutes == null ? undefined : halftimeStartedAt + breakMinutes * 60_000;

    await ctx.db.patch(args.matchId, {
      status: "halftime",
      currentQuarter: nextQ,
      quarterStartedAt: undefined,
      pausedAt: undefined,
      accumulatedPauseTime: undefined,
      bankedOverrunSeconds: nextBankedOverrunSeconds,
      frozenClockMs,
      activeStoppageStartedAt: undefined,
      halftimeStartedAt,
      scheduledBreakEndAt,
    });

    if (
      breakMinutes != null &&
      match.useBreakClock !== false &&
      match.breakClockAutoStart !== false
    ) {
      await ctx.scheduler.runAfter(
        breakMinutes * 60_000,
        internal.breakClockActions.autoResumeFromBreak,
        { matchId: args.matchId, expectedBreakEndAt: scheduledBreakEndAt as number }
      );
    }
  },
});

// Resume from halftime
export const resumeFromHalftime = mutation({
  args: { matchId: v.id("matches") },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Wedstrijd niet gevonden");
    const referee = await fetchRefereeForMatch(ctx, match);
    if (!(await verifyClockPin(ctx, match, undefined, referee))) {
      throw new Error("Geen toegang tot deze wedstrijd");
    }

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
      commandType: "RESUME_FROM_HALFTIME",
      timestamp: now,
      ...quarterStartStamp,
      createdAt: now,
    });
  },
});
