/**
 * TSC O13-2 — DIA JO13-2: treat Q4 as fully played and freeze the clock at 60:00.
 *
 * npx convex run ops/completeTscJo132Q4:apply '{"opsSecret":"..."}'
 */
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { requireAdminOrOps } from "../lib/opsAuth";
import { regulationEndClock } from "../lib/lateMatchRoster";

const MATCH_ID = "jn79bppqctkefgbjpe3kyx4f218cvy6f" as Id<"matches">;
const Q4_END_ID = "jd7cwf0gny9jx87kc3czz5k8sx8dcade" as Id<"matchEvents">;

export const apply = mutation({
  args: { opsSecret: v.optional(v.string()) },
  returns: v.object({
    frozenClockMs: v.number(),
    displayMinute: v.number(),
    q4DurationMs: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireAdminOrOps(ctx, args.opsSecret);

    const match = await ctx.db.get(MATCH_ID);
    if (!match) throw new Error("Wedstrijd TSC–JO13-2 niet gevonden");

    const regulation = match.regulationDurationMinutes ?? 60;
    const clock = regulationEndClock(regulation);
    const quarterMs = (regulation * 60 * 1000) / Math.max(1, match.quarterCount);

    const q4Start = (
      await ctx.db
        .query("matchEvents")
        .withIndex("by_match_type", (q) =>
          q.eq("matchId", MATCH_ID).eq("type", "quarter_start"),
        )
        .collect()
    ).find((event) => event.quarter === match.quarterCount);

    const q4End = await ctx.db.get(Q4_END_ID);
    if (!q4End || q4End.matchId !== MATCH_ID || q4End.type !== "quarter_end") {
      throw new Error("Einde kwart 4 niet gevonden");
    }

    const finishedAt = (q4Start?.timestamp ?? match.startedAt ?? q4End.timestamp) + quarterMs;

    await ctx.db.patch(Q4_END_ID, {
      displayMinute: clock.displayMinute,
      displayExtraMinute: undefined,
      gameSecond: clock.gameSecond,
      matchMs: clock.matchMs,
      timestamp: finishedAt,
    });

    await ctx.db.patch(MATCH_ID, {
      regulationDurationMinutes: regulation,
      frozenClockMs: clock.frozenClockMs,
      finishedAt,
      bankedOverrunSeconds: 0,
      currentQuarter: match.quarterCount,
    });

    return {
      frozenClockMs: clock.frozenClockMs,
      displayMinute: clock.displayMinute,
      q4DurationMs: quarterMs,
    };
  },
});
