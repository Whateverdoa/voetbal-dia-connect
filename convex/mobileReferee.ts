import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { listPilotMatches, pilotMatchAccess } from "./lib/mobilePilotAccess";
import { isUnavailable } from "./lib/matchPlayerAvailability";
import { applyGoalEnrichments } from "./lib/matchEventProjection";
import { mobilePilotWritesAllowed } from "./lib/mobilePilotWrites";
import { projectRefereeClock } from "./lib/refereeMatchPolicy";
import { refereeCommandArgs, refereeCommandResult } from "./lib/refereeRegistrationContract";
import { executeRefereeRegistration } from "./lib/refereeRegistration";
import { playingElapsedMs } from "./lib/officialMatchClock";
import { recordedPlayerName } from "./lib/matchEventProjection";

// No server flag or exact-match write permission is configured by this source.
const compatibility = { apiVersion: v.literal(1), clockPolicyVersion: v.union(v.literal(0), v.literal(1)), writesEnabled: v.boolean() };
function compatibilityFor(rights: Awaited<ReturnType<typeof pilotMatchAccess>>) {
  return { apiVersion: 1 as const, clockPolicyVersion: rights.match.refereePolicy ? 1 as const : 0 as const,
    writesEnabled: mobilePilotWritesAllowed(rights.scope, rights.match) };
}
const matchFields = {
  matchId: v.id("matches"), teamId: v.id("teams"), teamName: v.string(), opponent: v.string(),
  isHome: v.boolean(), status: v.string(), homeScore: v.number(), awayScore: v.number(),
  period: v.number(), periodCount: v.number(), periodMinutes: v.number(),
  controller: v.union(v.literal("referee"), v.literal("coach"), v.literal("none")),
  eligibleToControl: v.boolean(), canControl: v.boolean(), expiresAt: v.number(),
  version: v.number(),
  canAnnotate: v.boolean(),
};
function summary(rights: Awaited<ReturnType<typeof pilotMatchAccess>>) {
  const { match, team, scope } = rights;
  return { matchId: match._id, teamId: team._id, teamName: team.name, opponent: match.opponent,
    isHome: match.isHome, status: match.status, homeScore: match.homeScore, awayScore: match.awayScore,
    period: match.currentQuarter, periodCount: match.quarterCount,
    periodMinutes: (match.regulationDurationMinutes ?? 60) / match.quarterCount,
    controller: rights.controller, eligibleToControl: rights.eligibleToControl,
    canControl: mobilePilotWritesAllowed(scope, match) && rights.eligibleToControl, expiresAt: scope.expiresAt,
    canAnnotate: mobilePilotWritesAllowed(scope, match) && rights.isOfficialRegistrar && match.cancelledAt === undefined,
    version: match.refereePolicy ? match.refereePolicy.commandVersion + (projectRefereeClock(match, Date.now())!.changed ? 1 : 0) : 0 };
}

export const session = query({
  args: {},
  returns: v.object({ ...compatibility, subject: v.string(), expiresAt: v.number() }),
  handler: async ctx => {
    const matches = await listPilotMatches(ctx);
    return { apiVersion: 1 as const, clockPolicyVersion: matches.every(m => !!m.match.refereePolicy) ? 1 as const : 0 as const,
      writesEnabled: matches.some(m => mobilePilotWritesAllowed(m.scope, m.match) && m.eligibleToControl),
      subject: matches[0].subject, expiresAt: Math.min(...matches.map(m => m.scope.expiresAt)) };
  },
});

export const listMatches = query({
  args: {}, returns: v.object({ ...compatibility, matches: v.array(v.object(matchFields)) }),
  handler: async ctx => {
    const matches = await listPilotMatches(ctx);
    return { apiVersion: 1 as const, clockPolicyVersion: matches.every(m => !!m.match.refereePolicy) ? 1 as const : 0 as const,
      writesEnabled: matches.some(m => mobilePilotWritesAllowed(m.scope, m.match) && m.eligibleToControl), matches: matches.map(summary) };
  },
});

const clockView = v.union(v.null(), v.object({ elapsedMs: v.number(), runningSince: v.union(v.number(), v.null()),
  periodStartedElapsedMs: v.optional(v.number()), safetyMarginMinutes: v.number(), confirmedStoppageMs: v.number(),
  stoppageStartedAt: v.optional(v.number()), clockReviewReason: v.optional(v.string()),
  clockLimitElapsedMs: v.optional(v.number()), clockLimitAt: v.optional(v.number()), regularTimeReached: v.boolean() }));
export const getMatch = query({
  args: { matchId: v.id("matches") },
  returns: v.object({ ...compatibility, ...matchFields, clock: clockView, players: v.array(v.object({ playerId: v.id("players"), name: v.string(), number: v.optional(v.number()) })) }),
  handler: async (ctx, args) => {
    const rights = await pilotMatchAccess(ctx, args.matchId);
    const rows = await ctx.db.query("matchPlayers").withIndex("by_match", q => q.eq("matchId", args.matchId)).take(101);
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
    return { ...compatibilityFor(rights), ...summary(rights), players, clock };
  },
});

export const command = mutation({
  args: refereeCommandArgs, returns: refereeCommandResult,
  handler: async (ctx, args) => {
    const rights = await pilotMatchAccess(ctx, args.matchId);
    if (!mobilePilotWritesAllowed(rights.scope, rights.match)) throw new ConvexError("PILOT_WRITES_DISABLED");
    return await executeRefereeRegistration(ctx, args);
  },
});

const timelineEvent = v.object({ id: v.id("matchEvents"), type: v.string(), quarter: v.number(),
  matchMs: v.optional(v.number()), timestamp: v.number(), playerName: v.optional(v.string()),
  assistName: v.optional(v.string()), note: v.optional(v.string()), targetEventId: v.optional(v.id("matchEvents")),
  corrected: v.boolean(), isOpponentCard: v.optional(v.boolean()),
  isOpponentGoal: v.optional(v.boolean()), isOwnGoal: v.optional(v.boolean()) });
export const timeline = query({
  args: { matchId: v.id("matches"), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(timelineEvent),
  handler: async (ctx, args) => {
    const rights = await pilotMatchAccess(ctx, args.matchId);
    if (args.paginationOpts.numItems > 100) throw new ConvexError("RESOURCE_LIMIT");
    const result = await ctx.db.query("matchEvents").withIndex("by_match", q => q.eq("matchId", args.matchId))
      .order("desc").paginate(args.paginationOpts);
    const page = [];
    for (const event of result.page) {
      if (!["goal", "yellow_card", "red_card", "incident", "goal_correction"].includes(event.type)) continue;
      const enrichments = event.type === "goal" ? await ctx.db.query("matchEvents")
        .withIndex("by_match_and_target_and_type", q => q.eq("matchId", args.matchId).eq("targetEventId", event._id).eq("type", "goal_enrichment"))
        .take(101) : [];
      if (enrichments.length > 100) throw new ConvexError("RESOURCE_LIMIT");
      const enriched = applyGoalEnrichments([event, ...enrichments])[0];
      const player = enriched.playerId ? await ctx.db.get(enriched.playerId) : null;
      const assist = enriched.relatedPlayerId ? await ctx.db.get(enriched.relatedPlayerId) : null;
      const correction = event.type === "goal" ? await ctx.db.query("matchEvents")
        .withIndex("by_match_and_target_and_type", q => q.eq("matchId", args.matchId).eq("targetEventId", event._id).eq("type", "goal_correction")).first() : null;
      const annotations = ["yellow_card", "red_card", "incident"].includes(event.type) ? await ctx.db.query("matchEvents")
        .withIndex("by_match_and_target_and_type", q => q.eq("matchId", args.matchId).eq("targetEventId", event._id).eq("type", "official_annotation")).take(101) : [];
      if (annotations.length > 100) throw new ConvexError("RESOURCE_LIMIT");
      const displayed = [...annotations].sort((a, b) => a.createdAt - b.createdAt || String(a._id).localeCompare(String(b._id)))
        .reduce((prior, patch) => ({ ...prior, reportedName: patch.reportedName ?? prior.reportedName,
          reportedNumber: patch.reportedNumber ?? prior.reportedNumber, note: patch.note ?? prior.note }), event);
      page.push({ id: event._id, type: event.type, quarter: event.quarter, matchMs: enriched.matchMs,
        timestamp: event.timestamp, playerName: recordedPlayerName(displayed, player?.teamId === rights.team._id ? player.name : undefined),
        assistName: assist?.teamId === rights.team._id ? assist.name : undefined, note: displayed.note,
        targetEventId: event.targetEventId, corrected: !!correction, isOpponentCard: event.isOpponentCard,
        isOpponentGoal: event.isOpponentGoal, isOwnGoal: event.isOwnGoal });
    }
    return { ...result, page };
  },
});
