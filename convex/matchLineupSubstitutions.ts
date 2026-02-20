/**
 * Match lineup substitution mutations.
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { recordPlayingTime } from "./playingTimeHelpers";
import {
  verifyCoachTeamMembership,
  verifyIsMatchLead,
} from "./pinHelpers";
import {
  buildEventGameTimeStamp,
  getEffectiveEventTime,
} from "./lib/matchEventGameTime";

// Substitution from field view — same as substitute but transfers fieldSlotIndex
// and records sub_out/sub_in events so timeline stays in sync
export const substituteFromField = mutation({
  args: {
    matchId: v.id("matches"),
    pin: v.string(),
    playerOutId: v.id("players"),
    playerInId: v.id("players"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Invalid match or PIN");
    }
    if (!(await verifyCoachTeamMembership(ctx, match, args.pin))) {
      throw new Error("Invalid match or PIN");
    }
    if (
      (match.status === "live" || match.status === "halftime") &&
      !(await verifyIsMatchLead(ctx, match, args.pin))
    ) {
      throw new Error("Alleen de wedstrijdleider mag wissels uitvoeren");
    }

    const now = Date.now();
    const effectiveEventTime = getEffectiveEventTime(match, now);
    const substitutionStamp = buildEventGameTimeStamp(match, effectiveEventTime);

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

    if (!mpOut || !mpIn) {
      throw new Error("Speler niet in deze wedstrijd");
    }
    if (!mpOut.onField) {
      throw new Error("Speler die eruit gaat moet op het veld staan");
    }
    if (mpIn.onField) {
      throw new Error("Speler die erin gaat moet op de bank staan");
    }
    if (mpIn.absent) {
      throw new Error("Afwezige speler kan niet worden ingewisseld");
    }

    const slotToTransfer = mpOut.fieldSlotIndex;

    // Player going OFF — record playing time, clear slot
    if (mpOut.lastSubbedInAt) {
      await recordPlayingTime(ctx, mpOut, now);
    }
    await ctx.db.patch(mpOut._id, {
      onField: false,
      lastSubbedInAt: undefined,
      fieldSlotIndex: undefined,
    });

    // Player going ON — take the slot, start playing time
    const mpInUpdates: {
      onField: boolean;
      lastSubbedInAt: number;
      fieldSlotIndex?: number;
    } = {
      onField: true,
      lastSubbedInAt: now,
    };
    if (slotToTransfer !== undefined && slotToTransfer !== null) {
      mpInUpdates.fieldSlotIndex = slotToTransfer;
    }
    await ctx.db.patch(mpIn._id, mpInUpdates);

    // Log events (same as list substitution)
    await ctx.db.insert("matchEvents", {
      matchId: args.matchId,
      type: "sub_out",
      playerId: args.playerOutId,
      relatedPlayerId: args.playerInId,
      quarter: match.currentQuarter,
      timestamp: effectiveEventTime,
      ...substitutionStamp,
      createdAt: now,
    });

    await ctx.db.insert("matchEvents", {
      matchId: args.matchId,
      type: "sub_in",
      playerId: args.playerInId,
      relatedPlayerId: args.playerOutId,
      quarter: match.currentQuarter,
      timestamp: effectiveEventTime,
      ...substitutionStamp,
      createdAt: now,
    });
  },
});
