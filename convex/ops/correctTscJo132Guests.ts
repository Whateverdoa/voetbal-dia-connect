/**
 * TSC O13-2 — DIA JO13-2 (29-08-2026): add Jip & Jonas after the fact
 * and reattribute the Q3 goal to Jip (assist Miloud).
 *
 * npx convex run ops/correctTscJo132Guests:apply '{"opsSecret":"..."}'
 */
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { requireAdminOrOps } from "../lib/opsAuth";
import {
  assertMatchAcceptsRosterAdd,
  buildLateGuestMatchPlayer,
  remainingRegulationMinutes,
  regulationMinuteAtQuarterStart,
  secondHalfStartQuarter,
} from "../lib/lateMatchRoster";

const MATCH_ID = "jn79bppqctkefgbjpe3kyx4f218cvy6f" as Id<"matches">;
const JIP_ID = "js7e814yag7herbs5fjgptm0c18dcjaz" as Id<"players">;
const JONAS_ID = "js7frzp82xprg54q860z5sm7j18ddd7x" as Id<"players">;
const MILOUD_ID = "js7a98v3ya44m5bbm67stkhdz98bp7w0" as Id<"players">;
const GOAL_ID = "jd7epw5hk60efy3rxbw6hw5c798dd8rr" as Id<"matchEvents">;

export const apply = mutation({
  args: { opsSecret: v.optional(v.string()) },
  returns: v.object({
    added: v.array(v.string()),
    alreadyInMatch: v.array(v.string()),
    goalCorrected: v.boolean(),
  }),
  handler: async (ctx, args) => {
    await requireAdminOrOps(ctx, args.opsSecret);

    const match = await ctx.db.get(MATCH_ID);
    if (!match) throw new Error("Wedstrijd TSC–JO13-2 niet gevonden");
    assertMatchAcceptsRosterAdd(match.status);

    const jip = await ctx.db.get(JIP_ID);
    const jonas = await ctx.db.get(JONAS_ID);
    const miloud = await ctx.db.get(MILOUD_ID);
    if (!jip || !jonas || !miloud) {
      throw new Error("Jip, Jonas of Miloud niet gevonden");
    }

    const quarterCount = match.quarterCount;
    const regulation = match.regulationDurationMinutes ?? 60;
    const halfQuarter = secondHalfStartQuarter(quarterCount);
    const displayMinute = regulationMinuteAtQuarterStart(
      halfQuarter,
      quarterCount,
      regulation,
    );
    const minutesPlayed = remainingRegulationMinutes(
      halfQuarter,
      quarterCount,
      regulation,
    );

    const q3Start = (
      await ctx.db
        .query("matchEvents")
        .withIndex("by_match_type", (q) =>
          q.eq("matchId", MATCH_ID).eq("type", "quarter_start"),
        )
        .collect()
    ).find((event) => event.quarter === halfQuarter);

    const now = Date.now();
    const stampAt = q3Start?.timestamp ?? match.startedAt ?? now;
    const added: string[] = [];
    const alreadyInMatch: string[] = [];

    for (const player of [jip, jonas]) {
      const existing = await ctx.db
        .query("matchPlayers")
        .withIndex("by_match_player", (q) =>
          q.eq("matchId", MATCH_ID).eq("playerId", player._id),
        )
        .first();
      if (existing) {
        alreadyInMatch.push(player.name);
        continue;
      }

      await ctx.db.insert(
        "matchPlayers",
        buildLateGuestMatchPlayer({
          matchId: MATCH_ID,
          playerId: player._id,
          createdAt: now,
          minutesPlayed,
          lastSubbedInAt: stampAt,
        }),
      );

      await ctx.db.insert("matchEvents", {
        matchId: MATCH_ID,
        type: "sub_in",
        playerId: player._id,
        quarter: halfQuarter,
        displayMinute,
        matchMs: q3Start?.matchMs,
        gameSecond: q3Start?.gameSecond,
        timestamp: stampAt,
        note: "Achteraf toegevoegd (2e helft, JO13-1)",
        createdAt: now,
      });
      added.push(player.name);
    }

    const goal = await ctx.db.get(GOAL_ID);
    if (!goal || goal.matchId !== MATCH_ID || goal.type !== "goal") {
      throw new Error("Q3-doelpunt niet gevonden");
    }

    const alreadyCorrect =
      goal.playerId === JIP_ID && goal.relatedPlayerId === MILOUD_ID;
    if (!alreadyCorrect) {
      await ctx.db.patch(GOAL_ID, {
        playerId: JIP_ID,
        relatedPlayerId: MILOUD_ID,
      });
      await ctx.db.insert("matchEvents", {
        matchId: MATCH_ID,
        type: "goal_enrichment",
        targetEventId: GOAL_ID,
        playerId: JIP_ID,
        relatedPlayerId: MILOUD_ID,
        quarter: goal.quarter,
        displayMinute: goal.displayMinute,
        matchMs: goal.matchMs,
        gameSecond: goal.gameSecond,
        timestamp: now,
        commandType: "ENRICH_GOAL",
        note: "Achteraf: Jip, assist Miloud",
        createdAt: now,
      });
    }

    return {
      added,
      alreadyInMatch,
      goalCorrected: !alreadyCorrect,
    };
  },
});
