/**
 * Discipline cards (yellow / red) for O13 Cat A/B tijdstraf pilot rules.
 * Opponent cards are timeline/admin only (no lineup or countdown side effects).
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { verifyCoachTeamMembership } from "./pinHelpers";
import {
  buildEventGameTimeStamp,
  getEffectiveEventTime,
} from "./lib/matchEventGameTime";
import { recordPlayingTime } from "./playingTimeHelpers";
import { cardNoteFor, opponentCardNote } from "../src/lib/cards/cardRules";

const cardTypeValidator = v.union(
  v.literal("yellow_card"),
  v.literal("red_card")
);

export const addCard = mutation({
  args: {
    matchId: v.id("matches"),
    cardType: cardTypeValidator,
    playerId: v.optional(v.id("players")),
    isOpponentCard: v.optional(v.boolean()),
    correlationId: v.optional(v.string()),
  },
  returns: v.object({
    eventType: cardTypeValidator,
    note: v.string(),
    secondYellow: v.boolean(),
    isOpponentCard: v.boolean(),
  }),
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Wedstrijd niet gevonden");
    if (match.status !== "live" && match.status !== "halftime") {
      throw new Error("Kaarten alleen tijdens de wedstrijd");
    }
    if (!(await verifyCoachTeamMembership(ctx, match))) {
      throw new Error("Geen toegang tot deze wedstrijd");
    }

    const isOpponentCard = args.isOpponentCard === true;
    if (isOpponentCard && args.playerId) {
      throw new Error("Tegenstander-kaart heeft geen eigen speler");
    }
    if (!isOpponentCard && !args.playerId) {
      throw new Error("Kies een eigen speler of de tegenstander");
    }

    const now = Date.now();
    const effectiveEventTime = getEffectiveEventTime(match, now);
    const stamp = buildEventGameTimeStamp(match, effectiveEventTime);

    if (isOpponentCard) {
      const resolved = opponentCardNote(args.cardType);
      await ctx.db.insert("matchEvents", {
        matchId: args.matchId,
        type: resolved.eventType,
        isOpponentCard: true,
        quarter: match.currentQuarter,
        matchMs: stamp.gameSecond * 1000,
        note: resolved.note,
        correlationId: args.correlationId,
        commandType: "ADD_CARD",
        timestamp: effectiveEventTime,
        ...stamp,
        createdAt: now,
      });
      return {
        eventType: resolved.eventType,
        note: resolved.note,
        secondYellow: false,
        isOpponentCard: true,
      };
    }

    const playerId = args.playerId!;
    const mp = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match_player", (q) =>
        q.eq("matchId", args.matchId).eq("playerId", playerId)
      )
      .first();
    if (!mp) throw new Error("Speler niet in deze wedstrijd");

    const priorCards = await ctx.db
      .query("matchEvents")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();
    const priorYellows = priorCards.filter(
      (e) =>
        e.type === "yellow_card" &&
        e.playerId === playerId &&
        !e.isOpponentCard
    ).length;
    const alreadyRed = priorCards.some(
      (e) =>
        e.type === "red_card" && e.playerId === playerId && !e.isOpponentCard
    );
    if (alreadyRed) {
      throw new Error("Speler heeft al een rode kaart");
    }

    const resolved = cardNoteFor(args.cardType, priorYellows);

    if (mp.onField) {
      if (mp.lastSubbedInAt) {
        await recordPlayingTime(ctx, mp, now);
      }
      await ctx.db.patch(mp._id, {
        onField: false,
        fieldSlotIndex: undefined,
        lastSubbedInAt: undefined,
      });
    }

    if (resolved.alsoYellow) {
      await ctx.db.insert("matchEvents", {
        matchId: args.matchId,
        type: "yellow_card",
        playerId,
        quarter: match.currentQuarter,
        matchMs: stamp.gameSecond * 1000,
        note: "tweede gele kaart",
        correlationId: args.correlationId,
        commandType: "ADD_CARD",
        timestamp: effectiveEventTime,
        ...stamp,
        createdAt: now,
      });
    }

    await ctx.db.insert("matchEvents", {
      matchId: args.matchId,
      type: resolved.eventType,
      playerId,
      quarter: match.currentQuarter,
      matchMs: stamp.gameSecond * 1000,
      note: resolved.note,
      correlationId: args.correlationId,
      commandType: "ADD_CARD",
      timestamp: effectiveEventTime,
      ...stamp,
      createdAt: now,
    });

    return {
      eventType: resolved.eventType,
      note: resolved.note,
      secondYellow: resolved.alsoYellow === true,
      isOpponentCard: false,
    };
  },
});
