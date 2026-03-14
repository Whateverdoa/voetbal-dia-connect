import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { buildEventGameTimeStamp, getEffectiveEventTime } from "./lib/matchEventGameTime";
import { requireCoachTeamAccess } from "./authz";
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
    correlationId: v.string(),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    await requireCoachTeamAccess(ctx, match);
    if (!match) throw new Error("Wedstrijd niet gevonden");

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

    await ctx.db.insert("matchEvents", {
      matchId: args.matchId,
      type: "goal_enrichment",
      quarter: target.quarter,
      targetEventId: args.eventId,
      playerId: args.scorerId,
      relatedPlayerId: args.assistId,
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
