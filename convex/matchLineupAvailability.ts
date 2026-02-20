/**
 * Match lineup availability mutations - absent and public lineup visibility
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { verifyCoachTeamMembership } from "./pinHelpers";

/**
 * Toggle player absent status (in squad but not physically present, e.g. called in sick).
 * Only allowed before kickoff (scheduled/lineup). When marking absent, player is moved off field if on.
 */
export const togglePlayerAbsent = mutation({
  args: {
    matchId: v.id("matches"),
    pin: v.string(),
    playerId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Invalid match or PIN");
    }
    if (match.status !== "scheduled" && match.status !== "lineup") {
      throw new Error("Afwezigheid kan alleen vóór de aftrap worden gewijzigd");
    }
    if (!(await verifyCoachTeamMembership(ctx, match, args.pin))) {
      throw new Error("Invalid match or PIN");
    }

    const mp = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", args.matchId).eq("playerId", args.playerId)
      )
      .first();

    if (!mp) throw new Error("Speler niet in deze wedstrijd");

    const newAbsent = !mp.absent;
    const updates: { absent: boolean; onField?: boolean; fieldSlotIndex?: number } = {
      absent: newAbsent,
    };
    if (newAbsent && mp.onField) {
      updates.onField = false;
      updates.fieldSlotIndex = undefined;
    }
    await ctx.db.patch(mp._id, updates);
  },
});

// Toggle public lineup visibility
export const toggleShowLineup = mutation({
  args: { matchId: v.id("matches"), pin: v.string() },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Invalid match or PIN");
    }
    if (!(await verifyCoachTeamMembership(ctx, match, args.pin))) {
      throw new Error("Invalid match or PIN");
    }

    await ctx.db.patch(args.matchId, { showLineup: !match.showLineup });
  },
});
