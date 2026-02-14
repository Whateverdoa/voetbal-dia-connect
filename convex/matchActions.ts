/**
 * Match lifecycle mutations - create, start, quarters, finish
 * 
 * Event mutations are in matchEvents.ts
 * Lineup mutations are in matchLineup.ts
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { recordPlayingTime } from "./playingTimeHelpers";
import { verifyClockPin, verifyCoachPin } from "./pinHelpers";
import { fetchRefereeForMatch } from "./refereeHelpers";
import { generatePublicCode, MAX_CODE_GENERATION_ATTEMPTS } from "./helpers";

// Re-export from split modules for backwards compatibility
export { addGoal, substitute, removeLastGoal } from "./matchEvents";
export {
  togglePlayerOnField,
  toggleKeeper,
  toggleShowLineup,
  assignPlayerToSlot,
  setMatchFormation,
} from "./matchLineup";
export { pauseClock, resumeClock } from "./clockActions";
export { adjustScore } from "./scoreActions";
export { assignReferee } from "./refereeActions";
export { claimMatchLead, releaseMatchLead } from "./matchLeadActions";


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
    // Validate inputs
    const trimmedOpponent = args.opponent.trim();
    if (!trimmedOpponent) {
      throw new Error("Tegenstander is verplicht");
    }
    if (args.playerIds.length === 0) {
      throw new Error("Selecteer minimaal één speler");
    }

    // Generate unique public code with retry limit
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

    // Add players to match
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
    if (!verifyClockPin(match, args.pin, referee)) {
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
    });

    // Set lastSubbedInAt for all players currently on field
    const matchPlayers = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();

    for (const mp of matchPlayers) {
      if (mp.onField) {
        await ctx.db.patch(mp._id, { lastSubbedInAt: now });
      }
    }

    // Log quarter start event
    await ctx.db.insert("matchEvents", {
      matchId: args.matchId,
      type: "quarter_start",
      quarter: 1,
      timestamp: now,
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
    if (!verifyClockPin(match, args.pin, referee)) {
      throw new Error("Invalid match or PIN");
    }

    const now = Date.now();
    const nextQ = match.currentQuarter + 1;

    // If clock was paused, use pause timestamp as effective end time
    const effectiveEndTime = match.pausedAt ?? now;
    
    // Calculate playing time for all on-field players at quarter end
    const matchPlayers = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();

    for (const mp of matchPlayers) {
      if (mp.onField && mp.lastSubbedInAt) {
        await recordPlayingTime(ctx, mp, effectiveEndTime);
      }
    }
    
    // Log quarter end
    await ctx.db.insert("matchEvents", {
      matchId: args.matchId,
      type: "quarter_end",
      quarter: match.currentQuarter,
      timestamp: now,
      createdAt: now,
    });

    if (nextQ > match.quarterCount) {
      // Match finished
      await ctx.db.patch(args.matchId, {
        status: "finished",
        quarterStartedAt: undefined,
        pausedAt: undefined,
        accumulatedPauseTime: undefined,
        finishedAt: now,
      });
    } else {
      // All inter-quarter transitions go to rest ("halftime")
      // Coach must manually start the next quarter
      await ctx.db.patch(args.matchId, {
        status: "halftime",
        currentQuarter: nextQ,
        quarterStartedAt: undefined,
        pausedAt: undefined,
        accumulatedPauseTime: undefined,
      });
    }
  },
});

// Resume from halftime
export const resumeFromHalftime = mutation({
  args: { matchId: v.id("matches"), pin: v.string() },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Wedstrijd niet gevonden");
    const referee = await fetchRefereeForMatch(ctx, match);
    if (!verifyClockPin(match, args.pin, referee)) {
      throw new Error("Invalid match or PIN");
    }

    const now = Date.now();

    await ctx.db.patch(args.matchId, {
      status: "live",
      quarterStartedAt: now,
      pausedAt: undefined,
      accumulatedPauseTime: 0,
    });

    // Restart time tracking for on-field players
    const matchPlayers = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();

    for (const mp of matchPlayers) {
      if (mp.onField) {
        await ctx.db.patch(mp._id, { lastSubbedInAt: now });
      }
    }

    await ctx.db.insert("matchEvents", {
      matchId: args.matchId,
      type: "quarter_start",
      quarter: match.currentQuarter,
      timestamp: now,
      createdAt: now,
    });
  },
});

// Update match status
export const updateStatus = mutation({
  args: {
    matchId: v.id("matches"),
    pin: v.string(),
    status: v.union(
      v.literal("scheduled"),
      v.literal("lineup"),
      v.literal("live"),
      v.literal("halftime"),
      v.literal("finished")
    ),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match || match.coachPin !== args.pin) {
      throw new Error("Invalid match or PIN");
    }

    await ctx.db.patch(args.matchId, { status: args.status });
  },
});
