/**
 * Match lifecycle mutations - create, start, quarters
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { recordPlayingTime } from "./playingTimeHelpers";
import { verifyClockPin } from "./pinHelpers";
import { fetchRefereeForMatch } from "./refereeHelpers";
import { generatePublicCode, MAX_CODE_GENERATION_ATTEMPTS } from "./helpers";
import {
  buildEventGameTimeStamp,
  computeQuarterOverrunSeconds,
  getEffectiveEventTime,
} from "./lib/matchEventGameTime";

// Create a new match
export const create = mutation({
  args: {
    teamId: v.id("teams"),
    opponent: v.string(),
    isHome: v.boolean(),
    coachPin: v.string(),
    quarterCount: v.optional(v.number()),
    scheduledAt: v.optional(v.number()),
    playerIds: v.array(v.id("players")),
  },
  handler: async (ctx, args) => {
    const coach = await ctx.db
      .query("coaches")
      .withIndex("by_pin", (q) => q.eq("pin", args.coachPin))
      .first();
    if (!coach) {
      throw new Error("Ongeldige PIN");
    }
    if (!coach.teamIds.includes(args.teamId)) {
      throw new Error("Coach is niet gekoppeld aan dit team");
    }

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

    const matchId = await ctx.db.insert("matches", {
      teamId: args.teamId,
      publicCode,
      coachPin: args.coachPin,
      opponent: trimmedOpponent,
      isHome: args.isHome,
      scheduledAt: args.scheduledAt,
      status: "scheduled",
      currentQuarter: 1,
      quarterCount: args.quarterCount ?? 4,
      homeScore: 0,
      awayScore: 0,
      showLineup: false,
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
  args: { matchId: v.id("matches"), pin: v.string() },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Wedstrijd niet gevonden");
    const referee = await fetchRefereeForMatch(ctx, match);
    if (!(await verifyClockPin(ctx, match, args.pin, referee))) {
      throw new Error("Invalid match or PIN");
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
      timestamp: now,
      ...quarterStartStamp,
      createdAt: now,
    });
  },
});

// End current quarter / start next
export const nextQuarter = mutation({
  args: { matchId: v.id("matches"), pin: v.string() },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Wedstrijd niet gevonden");
    const referee = await fetchRefereeForMatch(ctx, match);
    if (!(await verifyClockPin(ctx, match, args.pin, referee))) {
      throw new Error("Invalid match or PIN");
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

    const quarterEndStamp = buildEventGameTimeStamp(match, effectiveEndTime);

    await ctx.db.insert("matchEvents", {
      matchId: args.matchId,
      type: "quarter_end",
      quarter: match.currentQuarter,
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
        finishedAt: now,
      });
      return;
    }

    await ctx.db.patch(args.matchId, {
      status: "halftime",
      currentQuarter: nextQ,
      quarterStartedAt: undefined,
      pausedAt: undefined,
      accumulatedPauseTime: undefined,
      bankedOverrunSeconds: nextBankedOverrunSeconds,
    });
  },
});

// Resume from halftime
export const resumeFromHalftime = mutation({
  args: { matchId: v.id("matches"), pin: v.string() },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Wedstrijd niet gevonden");
    const referee = await fetchRefereeForMatch(ctx, match);
    if (!(await verifyClockPin(ctx, match, args.pin, referee))) {
      throw new Error("Invalid match or PIN");
    }

    const now = Date.now();

    await ctx.db.patch(args.matchId, {
      status: "live",
      quarterStartedAt: now,
      pausedAt: undefined,
      accumulatedPauseTime: 0,
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
      timestamp: now,
      ...quarterStartStamp,
      createdAt: now,
    });
  },
});
