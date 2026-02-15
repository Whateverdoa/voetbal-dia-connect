/**
 * Match lineup mutations - toggle player/keeper status
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { recordPlayingTime, startPlayingTime } from "./playingTimeHelpers";
import { verifyCoachTeamMembership, isMatchLead } from "./pinHelpers";

// Toggle player on/off field
export const togglePlayerOnField = mutation({
  args: {
    matchId: v.id("matches"),
    pin: v.string(),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }
    const coach = await verifyCoachTeamMembership(ctx, match, args.pin);
    if (!coach) {
      throw new Error("Ongeldige PIN of geen toegang");
    }
    if (!isMatchLead(match, coach._id)) {
      throw new Error("Alleen de wedstrijdleider kan dit doen");
    }

    const now = Date.now();

    const mp = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", args.matchId).eq("playerId", args.playerId)
      )
      .first();

    if (mp) {
      if (mp.onField) {
        // Going OFF field - record playing time (only if match is live)
        if (match.status === "live" && mp.lastSubbedInAt) {
          await recordPlayingTime(ctx, mp, now);
        }
        await ctx.db.patch(mp._id, { onField: false, lastSubbedInAt: undefined });
      } else {
        // Going ON field - start tracking time (only if match is live)
        if (match.status === "live") {
          await startPlayingTime(ctx, mp._id, now);
        } else {
          await ctx.db.patch(mp._id, { onField: true });
        }
      }
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
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }
    const coach = await verifyCoachTeamMembership(ctx, match, args.pin);
    if (!coach) {
      throw new Error("Ongeldige PIN of geen toegang");
    }
    if (!isMatchLead(match, coach._id)) {
      throw new Error("Alleen de wedstrijdleider kan dit doen");
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
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }
    const coach = await verifyCoachTeamMembership(ctx, match, args.pin);
    if (!coach) {
      throw new Error("Ongeldige PIN of geen toegang");
    }
    if (!isMatchLead(match, coach._id)) {
      throw new Error("Alleen de wedstrijdleider kan dit doen");
    }

    await ctx.db.patch(args.matchId, { showLineup: !match.showLineup });
  },
});
