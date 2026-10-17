import { v, ConvexError, type Infer } from "convex/values";
import type { PaginationOptions } from "convex/server";
import type { QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { isUnavailable } from "./matchPlayerAvailability";
import { applyGoalEnrichments, recordedPlayerName } from "./matchEventProjection";
import { projectRefereeClock } from "./refereeMatchPolicy";
import { playingElapsedMs } from "./officialMatchClock";

export type RefereeReadRights = { subject: string; match: Doc<"matches">; team: Doc<"teams">; controller: "referee" | "coach" | "none"; eligibleToControl: boolean; isOfficialRegistrar: boolean };
export const compatibility = { apiVersion: v.literal(1), clockPolicyVersion: v.union(v.literal(0), v.literal(1)), writesEnabled: v.boolean() };
export const matchFields = {
  actorSubject: v.string(), matchId: v.id("matches"), teamId: v.id("teams"), teamName: v.string(), opponent: v.string(),
  isHome: v.boolean(), status: v.string(), homeScore: v.number(), awayScore: v.number(),
  period: v.number(), periodCount: v.number(), periodMinutes: v.number(),
  controller: v.union(v.literal("referee"), v.literal("coach"), v.literal("none")),
  eligibleToControl: v.boolean(), canControl: v.boolean(), expiresAt: v.number(),
  version: v.number(), serverNow: v.number(), clockGuardPending: v.boolean(),
  canAnnotate: v.boolean(),
};

export function matchSummary(rights: RefereeReadRights, writesEnabled: boolean, expiresAt: number) {
  const { match, team } = rights;
  return { actorSubject: rights.subject, matchId: match._id, teamId: team._id, teamName: team.name, opponent: match.opponent,
    isHome: match.isHome, status: match.status, homeScore: match.homeScore, awayScore: match.awayScore,
    period: match.currentQuarter, periodCount: match.quarterCount,
    periodMinutes: (match.regulationDurationMinutes ?? 60) / match.quarterCount,
    controller: rights.controller, eligibleToControl: rights.eligibleToControl,
    canControl: writesEnabled && rights.eligibleToControl, expiresAt,
    canAnnotate: writesEnabled && rights.isOfficialRegistrar && match.cancelledAt === undefined,
    serverNow: Date.now(), clockGuardPending: projectRefereeClock(match, Date.now())?.changed ?? false,
    version: match.refereePolicy ? match.refereePolicy.commandVersion + (projectRefereeClock(match, Date.now())!.changed ? 1 : 0) : 0 };
}
const clockView = v.union(v.null(), v.object({ elapsedMs: v.number(), runningSince: v.union(v.number(), v.null()),
  periodStartedElapsedMs: v.optional(v.number()), safetyMarginMinutes: v.number(), confirmedStoppageMs: v.number(),
  stoppageStartedAt: v.optional(v.number()), clockReviewReason: v.optional(v.string()),
  clockLimitElapsedMs: v.optional(v.number()), clockLimitAt: v.optional(v.number()), regularTimeReached: v.boolean() }));

export const refereeDetailValidator = v.object({ ...compatibility, ...matchFields, opponentScorerNumberEnabled: v.optional(v.boolean()), clock: clockView, players: v.array(v.object({ playerId: v.id("players"), name: v.string(), number: v.optional(v.number()) })) });
export type RefereeDetail = Infer<typeof refereeDetailValidator>;
export async function readRefereeDetail(ctx: QueryCtx, rights: RefereeReadRights, writesEnabled: boolean, expiresAt: number): Promise<RefereeDetail> {
    const rows = await ctx.db.query("matchPlayers").withIndex("by_match", q => q.eq("matchId", rights.match._id)).take(101);
    if (rows.length > 100) throw new ConvexError("RESOURCE_LIMIT");
    const players = [];
    for (const row of rows) {
      if (isUnavailable(row)) continue;
      const player = await ctx.db.get(row.playerId);
      if (player?.active && player.teamId === rights.match.teamId && player.name.trim()) {
        players.push({ playerId: player._id, name: player.name, number: player.number });
      }
    }
    const protectedClock = projectRefereeClock(rights.match, Date.now())?.state;
    const clock = protectedClock ? { elapsedMs: protectedClock.elapsedMs, runningSince: protectedClock.runningSince,
      periodStartedElapsedMs: protectedClock.periodStartedElapsedMs, safetyMarginMinutes: protectedClock.safetyMarginMinutes,
      confirmedStoppageMs: protectedClock.confirmedStoppageMs, stoppageStartedAt: protectedClock.stoppageStartedAt,
      clockReviewReason: protectedClock.clockReviewReason, clockLimitElapsedMs: protectedClock.clockLimitElapsedMs,
      clockLimitAt: protectedClock.clockLimitAt, regularTimeReached: protectedClock.periodStartedElapsedMs !== undefined &&
        playingElapsedMs(protectedClock, Date.now()) - protectedClock.periodStartedElapsedMs >= protectedClock.periodMinutes * 60_000 } : null;
    return { apiVersion: 1 as const, clockPolicyVersion: rights.match.refereePolicy ? 1 as const : 0 as const, writesEnabled, ...matchSummary(rights, writesEnabled, expiresAt), players, clock, opponentScorerNumberEnabled: true };
}
export const timelineEvent = v.object({ id: v.id("matchEvents"), type: v.string(), quarter: v.number(),
  matchMs: v.optional(v.number()), timestamp: v.number(), playerName: v.optional(v.string()),
  assistName: v.optional(v.string()), note: v.optional(v.string()), targetEventId: v.optional(v.id("matchEvents")),
  corrected: v.boolean(), isOpponentCard: v.optional(v.boolean()),
  isOpponentGoal: v.optional(v.boolean()), isOwnGoal: v.optional(v.boolean()) });

export async function readRefereeTimeline(ctx: QueryCtx, rights: RefereeReadRights, paginationOpts: PaginationOptions) {
    if (paginationOpts.numItems > 100) throw new ConvexError("RESOURCE_LIMIT");
    const result = await ctx.db.query("matchEvents").withIndex("by_match", q => q.eq("matchId", rights.match._id))
      .order("desc").paginate(paginationOpts);
    const page = [];
    for (const event of result.page) {
      if (!["goal", "yellow_card", "red_card", "incident", "goal_correction"].includes(event.type)) continue;
      const enrichments = event.type === "goal" ? await ctx.db.query("matchEvents")
        .withIndex("by_match_and_target_and_type", q => q.eq("matchId", rights.match._id).eq("targetEventId", event._id).eq("type", "goal_enrichment"))
        .take(101) : [];
      if (enrichments.length > 100) throw new ConvexError("RESOURCE_LIMIT");
      const enriched = applyGoalEnrichments([event, ...enrichments])[0];
      const player = enriched.playerId ? await ctx.db.get(enriched.playerId) : null;
      const assist = enriched.relatedPlayerId ? await ctx.db.get(enriched.relatedPlayerId) : null;
      const correction = event.type === "goal" ? await ctx.db.query("matchEvents")
        .withIndex("by_match_and_target_and_type", q => q.eq("matchId", rights.match._id).eq("targetEventId", event._id).eq("type", "goal_correction")).first() : null;
      const annotations = ["yellow_card", "red_card", "incident"].includes(event.type) ? await ctx.db.query("matchEvents")
        .withIndex("by_match_and_target_and_type", q => q.eq("matchId", rights.match._id).eq("targetEventId", event._id).eq("type", "official_annotation")).take(101) : [];
      if (annotations.length > 100) throw new ConvexError("RESOURCE_LIMIT");
      const displayed = [...annotations].sort((a, b) => a.createdAt - b.createdAt || String(a._id).localeCompare(String(b._id)))
        .reduce((prior, patch) => ({ ...prior, reportedName: patch.reportedName ?? prior.reportedName,
          reportedNumber: patch.reportedNumber ?? prior.reportedNumber, note: patch.note ?? prior.note }), event);
      page.push({ id: event._id, type: event.type, quarter: event.quarter, matchMs: enriched.matchMs,
        timestamp: event.timestamp, playerName: recordedPlayerName(event.type === "goal" ? enriched : displayed, player?.teamId === rights.team._id ? player.name : undefined),
        assistName: assist?.teamId === rights.team._id ? assist.name : undefined, note: displayed.note,
        targetEventId: event.targetEventId, corrected: !!correction, isOpponentCard: event.isOpponentCard,
        isOpponentGoal: event.isOpponentGoal, isOwnGoal: event.isOwnGoal });
    }
    return { ...result, page };

}
