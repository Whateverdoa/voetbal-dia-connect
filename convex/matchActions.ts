import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Generate a random 6-char code
function generatePublicCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No O, 0, I, 1
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

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
    // Generate unique public code
    let publicCode = generatePublicCode();
    let existing = await ctx.db
      .query("matches")
      .withIndex("by_code", (q) => q.eq("publicCode", publicCode))
      .first();
    while (existing) {
      publicCode = generatePublicCode();
      existing = await ctx.db
        .query("matches")
        .withIndex("by_code", (q) => q.eq("publicCode", publicCode))
        .first();
    }

    const matchId = await ctx.db.insert("matches", {
      teamId: args.teamId,
      publicCode,
      coachPin: args.coachPin,
      opponent: args.opponent,
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
    if (!match || match.coachPin !== args.pin) {
      throw new Error("Invalid match or PIN");
    }

    await ctx.db.patch(args.matchId, {
      status: "live",
      currentQuarter: 1,
      startedAt: Date.now(),
    });

    // Log quarter start event
    await ctx.db.insert("matchEvents", {
      matchId: args.matchId,
      type: "quarter_start",
      quarter: 1,
      timestamp: Date.now(),
      createdAt: Date.now(),
    });
  },
});

// End current quarter / start next
export const nextQuarter = mutation({
  args: { matchId: v.id("matches"), pin: v.string() },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match || match.coachPin !== args.pin) {
      throw new Error("Invalid match or PIN");
    }

    const nextQ = match.currentQuarter + 1;
    
    // Log quarter end
    await ctx.db.insert("matchEvents", {
      matchId: args.matchId,
      type: "quarter_end",
      quarter: match.currentQuarter,
      timestamp: Date.now(),
      createdAt: Date.now(),
    });

    if (nextQ > match.quarterCount) {
      // Match finished
      await ctx.db.patch(args.matchId, {
        status: "finished",
        finishedAt: Date.now(),
      });
    } else {
      // Halftime?
      const isHalftime = match.quarterCount === 4 && nextQ === 3;
      
      await ctx.db.patch(args.matchId, {
        status: isHalftime ? "halftime" : "live",
        currentQuarter: nextQ,
      });

      if (!isHalftime) {
        await ctx.db.insert("matchEvents", {
          matchId: args.matchId,
          type: "quarter_start",
          quarter: nextQ,
          timestamp: Date.now(),
          createdAt: Date.now(),
        });
      }
    }
  },
});

// Resume from halftime
export const resumeFromHalftime = mutation({
  args: { matchId: v.id("matches"), pin: v.string() },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match || match.coachPin !== args.pin) {
      throw new Error("Invalid match or PIN");
    }

    await ctx.db.patch(args.matchId, { status: "live" });

    await ctx.db.insert("matchEvents", {
      matchId: args.matchId,
      type: "quarter_start",
      quarter: match.currentQuarter,
      timestamp: Date.now(),
      createdAt: Date.now(),
    });
  },
});

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
    if (!match || match.coachPin !== args.pin) {
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
    if (!match || match.coachPin !== args.pin) {
      throw new Error("Invalid match or PIN");
    }

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

    if (mpOut) {
      await ctx.db.patch(mpOut._id, { onField: false });
    }
    if (mpIn) {
      await ctx.db.patch(mpIn._id, { onField: true });
    }

    // Log events
    await ctx.db.insert("matchEvents", {
      matchId: args.matchId,
      type: "sub_out",
      playerId: args.playerOutId,
      relatedPlayerId: args.playerInId,
      quarter: match.currentQuarter,
      timestamp: Date.now(),
      createdAt: Date.now(),
    });

    await ctx.db.insert("matchEvents", {
      matchId: args.matchId,
      type: "sub_in",
      playerId: args.playerInId,
      relatedPlayerId: args.playerOutId,
      quarter: match.currentQuarter,
      timestamp: Date.now(),
      createdAt: Date.now(),
    });
  },
});

// Toggle player on/off field
export const togglePlayerOnField = mutation({
  args: {
    matchId: v.id("matches"),
    pin: v.string(),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match || match.coachPin !== args.pin) {
      throw new Error("Invalid match or PIN");
    }

    const mp = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", args.matchId).eq("playerId", args.playerId)
      )
      .first();

    if (mp) {
      await ctx.db.patch(mp._id, { onField: !mp.onField });
    }
  },
});

// Toggle keeper status
export const toggleKeeper = mutation({
  args: {
    matchId: v.id("matches"),
    pin: v.string(),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match || match.coachPin !== args.pin) {
      throw new Error("Invalid match or PIN");
    }

    const mp = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", args.matchId).eq("playerId", args.playerId)
      )
      .first();

    if (mp) {
      // Remove keeper from others first
      const allMps = await ctx.db
        .query("matchPlayers")
        .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
        .collect();
      
      for (const other of allMps) {
        if (other.isKeeper && other._id !== mp._id) {
          await ctx.db.patch(other._id, { isKeeper: false });
        }
      }

      await ctx.db.patch(mp._id, { isKeeper: !mp.isKeeper });
    }
  },
});

// Toggle public lineup visibility
export const toggleShowLineup = mutation({
  args: { matchId: v.id("matches"), pin: v.string() },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match || match.coachPin !== args.pin) {
      throw new Error("Invalid match or PIN");
    }

    await ctx.db.patch(args.matchId, { showLineup: !match.showLineup });
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
