/**
 * Discipline cards (yellow / red). Official duty: assigned referee,
 * or match lead when no referee is using the app.
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { verifyClockPin } from "./pinHelpers";
import {
  buildEventGameTimeStamp,
  getEffectiveEventTime,
} from "./lib/matchEventGameTime";
import { recordPlayingTime } from "./playingTimeHelpers";
import { cardNoteFor, opponentCardNote } from "../src/lib/cards/cardRules";
import {
  compactDefined,
  findRosterPlayer,
  formatReportedPerson,
  type CardRosterPlayer,
} from "./lib/cardEntry";

const cardTypeValidator = v.union(
  v.literal("yellow_card"),
  v.literal("red_card"),
);

const addCardResult = v.object({
  eventType: cardTypeValidator,
  note: v.string(),
  secondYellow: v.boolean(),
  isOpponentCard: v.boolean(),
});

export const addCard = mutation({
  args: {
    matchId: v.id("matches"),
    cardType: cardTypeValidator,
    playerId: v.optional(v.id("players")),
    reportedName: v.optional(v.string()),
    reportedNumber: v.optional(v.number()),
    isOpponentCard: v.optional(v.boolean()),
    correlationId: v.optional(v.string()),
  },
  returns: addCardResult,
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new Error("Wedstrijd niet gevonden");
    if (match.status !== "live" && match.status !== "halftime") {
      throw new Error("Kaarten alleen tijdens de wedstrijd");
    }
    if (!(await verifyClockPin(ctx, match))) {
      throw new Error("Geen toegang tot deze wedstrijd");
    }

    const reportedName = args.reportedName?.trim() || undefined;
    const reportedNumber = args.reportedNumber;
    const isOpponentCard = args.isOpponentCard === true;
    if (isOpponentCard && args.playerId) {
      throw new Error("Tegenstander-kaart heeft geen eigen speler");
    }

    const now = Date.now();
    const effectiveEventTime = getEffectiveEventTime(match, now);
    const stamp = buildEventGameTimeStamp(match, effectiveEventTime);
    const reported = compactDefined({ reportedName, reportedNumber });
    const stampFields = compactDefined({
      gameSecond: stamp.gameSecond,
      displayMinute: stamp.displayMinute,
      displayExtraMinute: stamp.displayExtraMinute,
    });

    if (isOpponentCard) {
      const who = formatReportedPerson(reported);
      const resolved = opponentCardNote(args.cardType);
      const note = who ? `${resolved.note} · ${who}` : resolved.note;
      await ctx.db.insert("matchEvents", {
        matchId: args.matchId,
        type: resolved.eventType,
        isOpponentCard: true,
        quarter: match.currentQuarter,
        matchMs: stamp.gameSecond * 1000,
        note,
        ...reported,
        ...compactDefined({ correlationId: args.correlationId }),
        commandType: "ADD_CARD",
        timestamp: effectiveEventTime,
        ...stampFields,
        createdAt: now,
      });
      return {
        eventType: resolved.eventType,
        note,
        secondYellow: false,
        isOpponentCard: true,
      };
    }

    const matchPlayers = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();
    const roster: CardRosterPlayer[] = [];
    for (const row of matchPlayers) {
      const player = await ctx.db.get(row.playerId);
      if (!player) continue;
      roster.push({
        playerId: row.playerId,
        name: player.name,
        number: player.number,
      });
    }
    const matched = findRosterPlayer(roster, {
      playerId: args.playerId,
      reportedName,
      reportedNumber,
    });

    if (!matched) {
      const who = formatReportedPerson(reported);
      const resolved = cardNoteFor(args.cardType, 0);
      const note = who ? `${resolved.note} · ${who}` : resolved.note;
      await ctx.db.insert("matchEvents", {
        matchId: args.matchId,
        type: resolved.eventType,
        quarter: match.currentQuarter,
        matchMs: stamp.gameSecond * 1000,
        note,
        ...reported,
        ...compactDefined({ correlationId: args.correlationId }),
        commandType: "ADD_CARD",
        timestamp: effectiveEventTime,
        ...stampFields,
        createdAt: now,
      });
      return {
        eventType: resolved.eventType,
        note,
        secondYellow: false,
        isOpponentCard: false,
      };
    }

    const playerId = matched.playerId as Id<"players">;
    const mp = matchPlayers.find((row) => row.playerId === playerId);
    if (!mp) throw new Error("Speler niet in deze wedstrijd");

    const priorCards = await ctx.db
      .query("matchEvents")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .collect();
    const priorYellows = priorCards.filter(
      (event) =>
        event.type === "yellow_card" &&
        event.playerId === playerId &&
        !event.isOpponentCard,
    ).length;
    const alreadyRed = priorCards.some(
      (event) =>
        event.type === "red_card" &&
        event.playerId === playerId &&
        !event.isOpponentCard,
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
        ...reported,
        ...compactDefined({ correlationId: args.correlationId }),
        commandType: "ADD_CARD",
        timestamp: effectiveEventTime,
        ...stampFields,
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
      ...reported,
      ...compactDefined({ correlationId: args.correlationId }),
      commandType: "ADD_CARD",
      timestamp: effectiveEventTime,
      ...stampFields,
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
