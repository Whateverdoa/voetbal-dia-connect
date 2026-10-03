import { removeGoalRelations } from "./lib/goalRelations";
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { buildEventGameTimeStamp, getEffectiveEventTime } from "./lib/matchEventGameTime";
import { assistKindValidator } from "./lib/assistKind";
import { verifyCoachTeamMembership } from "./pinHelpers";
import { consumeCommandIdempotency } from "./lib/commandIdempotency";

function toMatchMs(gameSecond?: number): number | undefined {
  return gameSecond == null ? undefined : gameSecond * 1000;
}

export const enrichGoal = mutation({
  args: {
    matchId: v.id("matches"),
    eventId: v.id("matchEvents"),
    scorerId: v.optional(v.id("players")),
    assistId: v.optional(v.id("players")),
    assistKind: v.optional(assistKindValidator),
    correlationId: v.string(),
    replaceDetails: v.optional(v.boolean()),
    assistStatus: v.optional(v.union(v.literal("none"), v.literal("unknown"), v.literal("player"))),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match || !(await verifyCoachTeamMembership(ctx, match))) {
      throw new Error("Geen toegang tot deze wedstrijd");
    }

    const accepted = await consumeCommandIdempotency(ctx, {
      matchId: args.matchId,
      commandType: "ENRICH_GOAL",
      correlationId: args.correlationId,
    });
    if (!accepted) {
      return { deduped: true };
    }

    const target = await ctx.db.get(args.eventId);
    if (!target || target.matchId !== args.matchId) {
      throw new Error("Doelevent niet gevonden");
    }
    if (target.type !== "goal") {
      throw new Error("Alleen doelevents kunnen verrijkt worden");
    }
    if (args.assistId && (target.isOwnGoal || target.isOpponentGoal || args.assistId === args.scorerId)) {
      throw new Error("Deze assist is niet toegestaan bij dit doelpunt");
    }
    if (args.replaceDetails && ((args.assistStatus === "player") !== !!args.assistId)) {
      throw new Error("Kies een assistspeler of geen/onbekende assist");
    }
    if (args.scorerId) {
      const scorer = await ctx.db
        .query("matchPlayers")
        .withIndex("by_match_player", (q) =>
          q.eq("matchId", args.matchId).eq("playerId", args.scorerId!)
        )
        .first();
      if (!scorer) {
        throw new Error("Scorer zit niet in deze wedstrijdselectie");
      }
    }
    if (args.assistId) {
      const assist = await ctx.db
        .query("matchPlayers")
        .withIndex("by_match_player", (q) =>
          q.eq("matchId", args.matchId).eq("playerId", args.assistId!)
        )
        .first();
      if (!assist) {
        throw new Error("Assistspeler zit niet in deze wedstrijdselectie");
      }
    }

    const now = Date.now();
    const effectiveEventTime = getEffectiveEventTime(match, now);
    const stamp = buildEventGameTimeStamp(match, effectiveEventTime);

    if (args.replaceDetails) {
      const events = await ctx.db.query("matchEvents").withIndex("by_match", q => q.eq("matchId", args.matchId)).take(501);
      if (events.length > 500) throw new Error("Te veel registraties voor deze correctie");
      await removeGoalRelations(ctx, target, events);
      await ctx.db.patch(target._id, { playerId: args.scorerId, relatedPlayerId: args.assistId, assistKind: args.assistKind, assistStatus: args.assistStatus });
      if (args.assistId) await ctx.db.insert("matchEvents", {
        matchId: args.matchId, type: "assist", targetEventId: target._id, playerId: args.assistId,
        relatedPlayerId: args.scorerId, assistKind: args.assistKind, quarter: target.quarter,
        timestamp: target.timestamp, gameSecond: target.gameSecond, displayMinute: target.displayMinute,
        displayExtraMinute: target.displayExtraMinute, correlationId: args.correlationId, commandType: "ENRICH_GOAL", createdAt: now,
      });
    }

    await ctx.db.insert("matchEvents", {
      matchId: args.matchId,
      type: "goal_enrichment",
      quarter: target.quarter,
      targetEventId: args.eventId,
      playerId: args.scorerId,
      relatedPlayerId: args.assistId,
      assistKind: args.assistKind,
      replacesGoalDetails: args.replaceDetails,
      assistStatus: args.assistStatus,
      matchMs: toMatchMs(stamp.gameSecond),
      correlationId: args.correlationId,
      commandType: "ENRICH_GOAL",
      timestamp: effectiveEventTime,
      ...stamp,
      createdAt: now,
    });

    return { deduped: false };
  },
});
