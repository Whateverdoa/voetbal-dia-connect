import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { query } from "./_generated/server";
import { listPilotMatches, pilotMatchAccess } from "./lib/mobilePilotAccess";
import { isUnavailable } from "./lib/matchPlayerAvailability";
import { applyGoalEnrichments } from "./lib/matchEventProjection";

// This first slice is intentionally read-only. Never advertise legacy controls
// until shared web/native command, clock and correction enforcement is complete.
const compatibility = { apiVersion: v.literal(1), clockPolicyVersion: v.literal(0), writesEnabled: v.literal(false) };
const compatibilityValue = { apiVersion: 1 as const, clockPolicyVersion: 0 as const, writesEnabled: false as const };
const matchFields = {
  matchId: v.id("matches"), teamId: v.id("teams"), teamName: v.string(), opponent: v.string(),
  isHome: v.boolean(), status: v.string(), homeScore: v.number(), awayScore: v.number(),
  period: v.number(), periodCount: v.number(), periodMinutes: v.number(),
  controller: v.union(v.literal("referee"), v.literal("coach"), v.literal("none")),
  eligibleToControl: v.boolean(), canControl: v.literal(false), expiresAt: v.number(),
};
function summary(rights: Awaited<ReturnType<typeof pilotMatchAccess>>) {
  const { match, team, scope } = rights;
  return { matchId: match._id, teamId: team._id, teamName: team.name, opponent: match.opponent,
    isHome: match.isHome, status: match.status, homeScore: match.homeScore, awayScore: match.awayScore,
    period: match.currentQuarter, periodCount: match.quarterCount,
    periodMinutes: (match.regulationDurationMinutes ?? 60) / match.quarterCount,
    controller: rights.controller, eligibleToControl: rights.eligibleToControl,
    canControl: false as const, expiresAt: scope.expiresAt };
}

export const session = query({
  args: {},
  returns: v.object({ ...compatibility, subject: v.string(), expiresAt: v.number() }),
  handler: async ctx => {
    const matches = await listPilotMatches(ctx);
    return { ...compatibilityValue, subject: matches[0].subject, expiresAt: Math.min(...matches.map(m => m.scope.expiresAt)) };
  },
});

export const listMatches = query({
  args: {}, returns: v.object({ ...compatibility, matches: v.array(v.object(matchFields)) }),
  handler: async ctx => ({ ...compatibilityValue, matches: (await listPilotMatches(ctx)).map(summary) }),
});

export const getMatch = query({
  args: { matchId: v.id("matches") },
  returns: v.object({ ...compatibility, ...matchFields, players: v.array(v.object({ playerId: v.id("players"), name: v.string(), number: v.optional(v.number()) })) }),
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
    return { ...compatibilityValue, ...summary(rights), players };
  },
});

const timelineEvent = v.object({ id: v.id("matchEvents"), type: v.string(), quarter: v.number(),
  matchMs: v.optional(v.number()), timestamp: v.number(), playerName: v.optional(v.string()),
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
      if (!["goal", "yellow_card", "red_card"].includes(event.type)) continue;
      const enrichments = event.type === "goal" ? await ctx.db.query("matchEvents")
        .withIndex("by_match_and_target_and_type", q => q.eq("matchId", args.matchId).eq("targetEventId", event._id).eq("type", "goal_enrichment"))
        .take(101) : [];
      if (enrichments.length > 100) throw new ConvexError("RESOURCE_LIMIT");
      const enriched = applyGoalEnrichments([event, ...enrichments])[0];
      const player = enriched.playerId ? await ctx.db.get(enriched.playerId) : null;
      page.push({ id: event._id, type: event.type, quarter: event.quarter, matchMs: enriched.matchMs,
        timestamp: event.timestamp, playerName: player?.teamId === rights.team._id ? player.name : undefined,
        isOpponentGoal: event.isOpponentGoal, isOwnGoal: event.isOwnGoal });
    }
    return { ...result, page };
  },
});
