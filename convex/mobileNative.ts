import { lineupSnapshot, recordLineupChange } from "./lib/nativeLineupHistory";
import { FORMATIONS } from "../src/lib/formations";
import { v, type ObjectType } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUserAccess } from "./lib/userAccess";
import { hasAdminRole } from "./lib/adminOverride";
import { applyGoalEnrichments, recordedPlayerName } from "./lib/matchEventProjection";
import { api } from "./_generated/api";
import { verifyCoachTeamMembership, verifyIsMatchLead } from "./pinHelpers";
import { consumeCommandIdempotency } from "./lib/commandIdempotency";
import { readEventState } from "./mobileMatchEvents";
import { disciplineBadgeByPlayerId, deriveActiveTimePenalties, matchPenaltyClockNow } from "../src/lib/cards/cardRules";

const fields = {
  lastLineupChange: v.union(v.null(), v.object({ id: v.id("nativeLineupChanges"), label: v.string(), canUndo: v.boolean(), playerOutId: v.optional(v.id("players")) })),
  id: v.id("matches"), revision: v.string(), teamName: v.string(), opponent: v.string(), isHome: v.boolean(),
  status: v.union(v.literal("scheduled"), v.literal("lineup"), v.literal("live"), v.literal("halftime"), v.literal("finished")),
  currentQuarter: v.number(), quarterCount: v.number(), regulationDurationMinutes: v.optional(v.number()),
  homeScore: v.number(), awayScore: v.number(), quarterStartedAt: v.optional(v.number()), frozenClockMs: v.optional(v.number()),
  activeStoppageStartedAt: v.optional(v.number()), pausedAt: v.optional(v.number()), halftimeStartedAt: v.optional(v.number()),
  scheduledBreakEndAt: v.optional(v.number()), breakClockAutoStart: v.optional(v.boolean()),
  teamLogoUrl: v.optional(v.string()), clubLogoUrl: v.optional(v.string()), opponentLogoUrl: v.optional(v.string()),
  formationId: v.optional(v.string()),
  customFormationTemplate: v.union(v.null(), v.object({ name: v.string(), structure: v.string(), slots: v.array(v.object({ id: v.number(), x: v.number(), y: v.number(), position: v.string() })) })),
  canPrepare: v.boolean(),
  formations: v.array(v.object({ id: v.string(), name: v.string(), custom: v.boolean() })),
  canControlClock: v.boolean(), canSubstitute: v.boolean(), canEnrich: v.boolean(), isCurrentCoachLead: v.boolean(), hasLead: v.boolean(),
  leadCoachName: v.union(v.null(), v.string()), refereeAssigned: v.boolean(),
  players: v.array(v.object({ playerId: v.id("players"), name: v.string(), number: v.optional(v.number()), onField: v.boolean(), isKeeper: v.boolean(), absent: v.boolean(), injured: v.boolean(), fieldSlotIndex: v.optional(v.number()), minutesPlayed: v.number(), lastSubbedInAt: v.optional(v.number()), card: v.optional(v.union(v.literal("yellow"), v.literal("red"))) })),
  timeline: v.array(v.object({ id: v.id("matchEvents"), type: v.string(), timestamp: v.number(), quarter: v.number(), displayMinute: v.optional(v.number()), playerName: v.optional(v.string()), relatedPlayerName: v.optional(v.string()), note: v.optional(v.string()), isOwnGoal: v.optional(v.boolean()), isOpponentGoal: v.optional(v.boolean()), isOpponentCard: v.optional(v.boolean()) })),
  penalties: v.array(v.object({ playerId: v.string(), kind: v.union(v.literal("sit_out"), v.literal("replace_wait")), endsAt: v.number(), remainingMs: v.number(), frozen: v.boolean(), ready: v.boolean() })),
};
type NativeDetail = ObjectType<typeof fields>;

export const getNativeMatch = query({
  args: { matchId: v.id("matches"), role: v.union(v.literal("coach"), v.literal("referee"), v.literal("admin")) },
  returns: v.union(v.null(), v.object(fields)),
  handler: async (ctx, args): Promise<NativeDetail | null> => {
    const access = await getCurrentUserAccess(ctx);
    if (!access || (!access.roles.includes(args.role) && !hasAdminRole(access))) return null;
    // Role-specific canonical queries perform assignment/admin checks themselves.
    const detail = args.role === "referee"
      ? await ctx.runQuery(api.refereeQueries.getForReferee, { matchId: args.matchId })
      : await ctx.runQuery(api.matches.getForCoach, { matchId: args.matchId });
    const state = await readEventState(ctx, args.matchId);
    if (!detail || !state) return null;
    const { match, events } = state;
    const rows = await ctx.db.query("matchPlayers").withIndex("by_match", q => q.eq("matchId", args.matchId)).take(51);
    if (rows.length > 50) throw new Error("Deze selectie is te groot voor de mobiele app");
    const badges = disciplineBadgeByPlayerId(events);
    const players = await Promise.all(rows.map(async row => {
      const player = await ctx.db.get(row.playerId);
      return { playerId: row.playerId, name: player?.name ?? "Onbekende speler", number: player?.number,
        onField: row.onField, isKeeper: row.isKeeper, absent: row.absent ?? false, injured: row.injured ?? false,
        fieldSlotIndex: row.fieldSlotIndex, minutesPlayed: row.minutesPlayed ?? 0, lastSubbedInAt: row.lastSubbedInAt, card: badges.get(row.playerId) };
    }));
    const namedEvents = events.map(event => ({ ...event,
      playerName: recordedPlayerName(event, players.find(p => p.playerId === event.playerId)?.name),
      relatedPlayerName: players.find(p => p.playerId === event.relatedPlayerId)?.name,
    }));
    const timeline = applyGoalEnrichments(namedEvents).filter(e => e.type !== "goal_enrichment").map(e => ({
      id: e._id, type: e.type, timestamp: e.timestamp, quarter: e.quarter, displayMinute: e.displayMinute,
      playerName: e.playerName, relatedPlayerName: e.relatedPlayerName, note: e.note,
      isOwnGoal: e.isOwnGoal, isOpponentGoal: e.isOpponentGoal, isOpponentCard: e.isOpponentCard,
    }));
    const { clockNow, frozen } = matchPenaltyClockNow(Date.now(), match);
    const penalties = deriveActiveTimePenalties(events, clockNow, frozen).map(({ playerId, kind, endsAt, remainingMs, frozen, ready }) => ({ playerId, kind, endsAt, remainingMs, frozen, ready }));
    const lead = match.leadCoachId ? await ctx.db.get(match.leadCoachId) : null;
    const isCurrentCoachLead = !!(await verifyIsMatchLead(ctx, match));
    const active = match.status === "live" || match.status === "halftime";
    const template = match.customFormationTemplateId ? await ctx.db.get(match.customFormationTemplateId) : null;
    const templates = await ctx.db.query("formationTemplates").withIndex("by_team", q => q.eq("teamId", match.teamId)).take(100);
    const preset = FORMATIONS[match.formationId ?? ""] ?? FORMATIONS[match.pitchType === "half" ? "8v8_1-3-3-1" : "11v11_1-4-3-3"];
    const preparedTemplate = template?.active && template.teamId === match.teamId ? { name: template.name, structure: template.structure, slots: template.slots } : { name: preset.name, structure: preset.name, slots: preset.slots };
    const lastChange = args.role !== "referee" ? await ctx.db.query("nativeLineupChanges").withIndex("by_match_undone", q => q.eq("matchId", args.matchId).eq("undone", false)).order("desc").first() : null;
    const planSignature = lastChange ? (await lineupSnapshot(ctx, args.matchId)).planSignature : "";
    return {
      lastLineupChange: lastChange ? { id: lastChange._id, label: lastChange.label, playerOutId: lastChange.playerOutId, canUndo: state.revision === lastChange.afterRevision && planSignature === lastChange.afterPlansSignature && match.status !== "finished" && (!active || isCurrentCoachLead) } : null,
      id: match._id, revision: state.revision, teamName: detail.teamName, opponent: match.opponent, isHome: match.isHome,
      status: match.status, currentQuarter: match.currentQuarter, quarterCount: match.quarterCount,
      regulationDurationMinutes: match.regulationDurationMinutes, homeScore: match.homeScore, awayScore: match.awayScore,
      quarterStartedAt: match.quarterStartedAt, frozenClockMs: match.frozenClockMs, activeStoppageStartedAt: match.activeStoppageStartedAt,
      pausedAt: match.pausedAt, halftimeStartedAt: match.halftimeStartedAt, scheduledBreakEndAt: match.scheduledBreakEndAt,
      breakClockAutoStart: match.breakClockAutoStart, teamLogoUrl: detail.teamLogoUrl ?? undefined, clubLogoUrl: detail.clubLogoUrl ?? undefined,
      opponentLogoUrl: detail.opponentLogoUrl ?? undefined, formationId: match.formationId,
      customFormationTemplate: preparedTemplate,
      canPrepare: args.role !== "referee" && state.canEnrich && (match.status === "scheduled" || match.status === "lineup"),
      formations: [...Object.entries(FORMATIONS).map(([id, formation]) => ({ id, name: formation.name, custom: false })), ...templates.filter(t => t.active).map(t => ({ id: t._id, name: t.name, custom: true }))],
      canControlClock: state.canWrite && (args.role !== "coach" || !match.refereeId),
      canSubstitute: args.role !== "referee" && isCurrentCoachLead && active,
      canEnrich: args.role !== "referee" && state.canEnrich && active,
      isCurrentCoachLead, hasLead: !!lead, leadCoachName: lead?.name ?? null, refereeAssigned: !!match.refereeId, players, penalties, timeline,
    };
  },
});

export const nativeSubstitute = mutation({
  args: { matchId: v.id("matches"), correlationId: v.string(), revision: v.string(), playerOutId: v.id("players"), playerInId: v.id("players") },
  returns: v.object({ deduped: v.boolean() }),
  handler: async (ctx, args): Promise<{ deduped: boolean }> => {
    const state = await readEventState(ctx, args.matchId);
    if (!state || !(await verifyCoachTeamMembership(ctx, state.match)) || !(await verifyIsMatchLead(ctx, state.match))) throw new Error("Alleen de wedstrijdleider mag wisselen");
    if (!args.correlationId.trim() || args.correlationId.length > 160) throw new Error("Ongeldige opdrachtcode");
    if (!(await consumeCommandIdempotency(ctx, { ...args, commandType: "NATIVE_SUBSTITUTE" }))) return { deduped: true };
    if (args.revision !== state.revision) throw new Error("De wedstrijd is gewijzigd. Controleer de wissel opnieuw.");
    if (state.match.status !== "live" && state.match.status !== "halftime") throw new Error("Wisselen kan alleen tijdens de wedstrijd of rust");
    if (args.playerOutId === args.playerInId) throw new Error("Kies twee verschillende spelers");
    const incoming = await ctx.db.query("matchPlayers").withIndex("by_match_player", q => q.eq("matchId", args.matchId).eq("playerId", args.playerInId)).first();
    const outgoing = await ctx.db.query("matchPlayers").withIndex("by_match_player", q => q.eq("matchId", args.matchId).eq("playerId", args.playerOutId)).first();
    if (!incoming || !outgoing || !outgoing.onField || incoming.absent || incoming.injured || outgoing.absent || outgoing.injured) throw new Error("Deze spelers zijn niet beschikbaar voor een wissel");
    const before = await lineupSnapshot(ctx, args.matchId);
    const positionSwap = incoming.onField;
    if (positionSwap) {
      await ctx.runMutation(api.matchLineup.swapFieldPositions, { matchId: args.matchId, playerAId: args.playerOutId, playerBId: args.playerInId });
    } else {
      await ctx.runMutation(api.matchActions.substituteFromField, { matchId: args.matchId, playerOutId: args.playerOutId, playerInId: args.playerInId, correlationId: args.correlationId });
    }
    const outName = (await ctx.db.get(args.playerOutId))?.name ?? "Speler";
    const inName = (await ctx.db.get(args.playerInId))?.name ?? "Speler";
    await recordLineupChange(ctx, { matchId: args.matchId, correlationId: args.correlationId, before, beforeEventIds: state.events.map(e => e._id), label: `${outName} ${positionSwap ? "↔" : "→"} ${inName}`, playerOutId: args.playerOutId });
    return { deduped: false };
  },
});
