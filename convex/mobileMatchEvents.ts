import { api } from "./_generated/api";
import { v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { verifyClockPin, verifyCoachTeamMembership } from "./pinHelpers";
import { consumeCommandIdempotency } from "./lib/commandIdempotency";
import { buildEventGameTimeStamp, getEffectiveEventTime } from "./lib/matchEventGameTime";
import { applyGoalEnrichments } from "./lib/matchEventProjection";
import { assistStatusValidator, countsValidator, eventKind, eventKindValidator, eventRowValidator, eventSide, eventSideValidator, eventTotals, isEditableEvent } from "./lib/mobileEventModel";

export async function readEventState(ctx: QueryCtx | MutationCtx, matchId: Id<"matches">) {
  const match = await ctx.db.get(matchId);
  if (!match) return null;
  const canWrite = await verifyClockPin(ctx, match);
  const canEnrich = !!(await verifyCoachTeamMembership(ctx, match));
  if (!canWrite && !canEnrich) return null;
  const events = await ctx.db.query("matchEvents").withIndex("by_match", q => q.eq("matchId", matchId)).take(501);
  if (events.length > 500) throw new Error("Deze wedstrijd heeft te veel registraties voor mobiele bewerking");
  const players = await ctx.db.query("matchPlayers").withIndex("by_match", q => q.eq("matchId", matchId)).take(51);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify([
    match.status, match.currentQuarter, match.leadCoachId, match.refereeId,
    match.formationId, match.customFormationTemplateId, match.pitchType, match.homeScore, match.awayScore, match.quarterStartedAt, match.activeStoppageStartedAt, match.pausedAt, events, players,
  ])));
  const revision = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
  return { match, events, canWrite, canEnrich, revision };
}

export const getMobileEvents = query({
  args: { matchId: v.id("matches") },
  returns: v.union(v.null(), v.object({ revision: v.string(), canRegister: v.boolean(), canCorrect: v.boolean(), canEnrich: v.boolean(), events: v.array(eventRowValidator), totals: v.object({ dia: countsValidator, opponent: countsValidator }) })),
  handler: async (ctx, args) => {
    const state = await readEventState(ctx, args.matchId);
    if (!state) return null;
    const projected = applyGoalEnrichments(state.events);
    const events = [];
    for (const event of projected) {
      const kind = eventKind(event);
      if (!kind) continue;
      const player = event.playerId ? await ctx.db.get(event.playerId) : null;
      const assist = event.relatedPlayerId ? await ctx.db.get(event.relatedPlayerId) : null;
      events.push({
        id: event._id, kind, side: eventSide(event), playerId: event.playerId,
        playerName: player?.name, opponentNumber: event.opponentNumber ?? event.reportedNumber,
        assistPlayerId: event.relatedPlayerId, assistName: assist?.name,
        assistStatus: event.assistStatus ?? (event.relatedPlayerId ? "player" as const : "unknown" as const),
        isOwnGoal: event.isOwnGoal, assistKind: event.assistKind, note: event.note, quarter: event.quarter,
        displayMinute: event.displayMinute, displayExtraMinute: event.displayExtraMinute,
        editable: isEditableEvent(event),
      });
    }
    const active = state.match.status === "live" || state.match.status === "halftime";
    return { revision: state.revision, canRegister: state.canWrite && active, canCorrect: state.canWrite && active, canEnrich: state.canEnrich && active, events, totals: eventTotals(projected) };
  },
});

export const eventCommandArgs = {
  matchId: v.id("matches"), correlationId: v.string(), revision: v.string(),
  operation: v.union(v.literal("add"), v.literal("update"), v.literal("remove")),
  eventId: v.optional(v.id("matchEvents")), kind: v.optional(eventKindValidator), side: v.optional(eventSideValidator),
  playerId: v.optional(v.id("players")), opponentNumber: v.optional(v.number()),
  assistPlayerId: v.optional(v.id("players")), assistStatus: v.optional(assistStatusValidator),
  assistKind: v.optional(v.union(v.literal("pass"), v.literal("corner"), v.literal("free_kick"), v.literal("penalty"))), isOwnGoal: v.optional(v.boolean()), note: v.optional(v.string()),
};
type EventCommand = import("convex/values").ObjectType<typeof eventCommandArgs>;

export { removeGoalRelations } from "./lib/goalRelations";
import { removeGoalRelations } from "./lib/goalRelations";

export async function executeEventCommand(ctx: MutationCtx, args: EventCommand): Promise<{ deduped: boolean }> {
  const state = await readEventState(ctx, args.matchId);
  if (!state) throw new Error("Geen toegang tot deze wedstrijdregistratie");
  const detailsOnly = args.operation === "update" && args.kind === "goal";
  if (detailsOnly ? !state.canEnrich : !state.canWrite) throw new Error("Geen toegang tot deze wedstrijdregistratie");
  if (!args.correlationId.trim() || args.correlationId.length > 160) throw new Error("Ongeldige opdrachtcode");
  if (!(await consumeCommandIdempotency(ctx, { matchId: args.matchId, commandType: "MOBILE_EVENT", correlationId: args.correlationId }))) return { deduped: true };
  if (args.revision !== state.revision) throw new Error("Het wedstrijdverloop is gewijzigd. Sluit dit venster en controleer de actuele gegevens.");
  const { match, events } = state;
  if (match.status !== "live" && match.status !== "halftime") throw new Error("Registreren en corrigeren kan tijdens de wedstrijd of rust");
  const target = args.eventId ? events.find(e => e._id === args.eventId) : undefined;
  if (args.operation !== "add" && (!target || !isEditableEvent(target))) throw new Error("Deze registratie kan hier niet worden gewijzigd");
  if (args.operation === "add" && args.eventId) throw new Error("Een nieuwe registratie heeft nog geen gebeurtenisnummer");
  if (args.operation === "remove") {
    if (target!.type === "goal") {
      const home = (eventSide(target!) === "dia") === match.isHome;
      const score = home ? match.homeScore : match.awayScore;
      if (score < 1) throw new Error("Stand en verloop komen niet overeen; controleer de wedstrijd");
      await ctx.runMutation(api.matchActions.adjustScore, { matchId: match._id, team: home ? "home" : "away", delta: -1, correlationId: args.correlationId });
      await removeGoalRelations(ctx, target!, events);
    }
    await ctx.db.delete(target!._id);
    return { deduped: false };
  }
  if (!args.kind || !args.side) throw new Error("Kies de registratie en het team");
  const isGoal = args.kind === "goal";
  const isCard = ["yellow_card", "red_card", "second_yellow"].includes(args.kind);
  if (args.operation === "add" && !isCard && match.status !== "live") throw new Error("Registreer deze gebeurtenis tijdens een speelhelft");
  if (target && ((target.type === "goal") !== isGoal || (isGoal && args.side !== eventSide(target)))) throw new Error("Een doelpunt kan niet van soort of team veranderen; neem het zo nodig terug");
  if (args.note && args.note.trim().length > 240) throw new Error("Gebruik maximaal 240 tekens voor de notitie");
  if (args.opponentNumber != null && ((args.isOwnGoal ? args.side !== "dia" : args.side !== "opponent") || !Number.isInteger(args.opponentNumber) || args.opponentNumber < 1 || args.opponentNumber > 99)) throw new Error("Kies een rugnummer van 1 tot 99 voor de tegenstander");
  for (const id of [args.playerId, args.assistPlayerId]) {
    if (!id) continue;
    const player = await ctx.db.query("matchPlayers").withIndex("by_match_player", q => q.eq("matchId", args.matchId).eq("playerId", id)).unique();
    // Historical corrections may reference an unavailable player, but never another squad.
    const playerSide = args.isOwnGoal ? args.side === "opponent" : args.side === "dia";
    if (!playerSide || !player || (args.operation === "add" && !isCard && (player.absent || player.injured))) throw new Error("Deze speler is niet beschikbaar voor dit team");
  }
  if (!isGoal && (args.assistPlayerId || args.assistStatus || args.assistKind)) throw new Error("Een assist hoort bij een doelpunt");
  const assistStatus = isGoal ? (args.assistStatus ?? "unknown") : undefined;
  if ((assistStatus === "player") !== !!args.assistPlayerId) throw new Error("Kies een assistspeler of geef aan dat er geen bekende assist is");
  if (args.assistPlayerId && args.assistPlayerId === args.playerId) throw new Error("Scorer en assistspeler moeten verschillen");
  if ((args.side === "opponent" || args.isOwnGoal || target?.isOwnGoal) && args.assistPlayerId) throw new Error("Een DIA-speler kan geen assist krijgen bij de tegenstander");
  const replaced = target && isGoal ? events.filter(e => (e.type === "assist" || e.type === "goal_enrichment") && (e.targetEventId === target._id || (e.type === "assist" && !!target.correlationId && e.correlationId === target.correlationId))).length : 0;
  const added = isCard ? 2 : isGoal ? (1 + (args.assistPlayerId ? 1 : 0)) : target ? 0 : 1;
  if (events.length - replaced + added > 500) throw new Error("Deze registratie overschrijdt de mobiele limiet van 500 gebeurtenissen");
  if (isCard) {
    if (args.operation !== "add") throw new Error("Een uitgevoerde kaart kan niet worden teruggenomen: de opstelling en speeltijd zijn al gewijzigd.");
    if (args.kind === "second_yellow") {
      const prior = events.some(e => e.type === "yellow_card" && e.playerId === args.playerId && !e.isOpponentCard);
      if (!args.playerId || args.side !== "dia" || !prior) throw new Error("Tweede geel vereist een eerdere gele kaart voor deze speler");
    }
    await ctx.runMutation(api.matchActions.addCard, {
      matchId: args.matchId, cardType: args.kind === "red_card" ? "red_card" : "yellow_card",
      playerId: args.playerId, reportedNumber: args.opponentNumber,
      isOpponentCard: args.side === "opponent", correlationId: args.correlationId,
    });
    return { deduped: false };
  }
  if (isGoal) {
    if (target) {
      await ctx.runMutation(api.matchActions.enrichGoal, {
        matchId: args.matchId, eventId: target._id, scorerId: args.playerId,
        assistId: args.assistPlayerId, assistKind: args.assistKind,
        replaceDetails: true, assistStatus, correlationId: args.correlationId,
      });
    } else {
      await ctx.runMutation(api.matchActions.addGoal, {
        matchId: args.matchId, playerId: args.playerId, assistPlayerId: args.assistPlayerId,
        assistKind: args.assistKind, isOwnGoal: args.isOwnGoal,
        isOpponentGoal: args.side === "opponent", correlationId: args.correlationId,
        assistStatus, reportedNumber: args.opponentNumber, note: args.note,
      });
    }
    return { deduped: false };
  }
  const now = Date.now();
  const timestamp = getEffectiveEventTime(match, now);
  const stamp = buildEventGameTimeStamp(match, timestamp);
  const details = { type: args.kind as "corner" | "free_kick", playerId: args.playerId, side: args.side,
    opponentNumber: args.opponentNumber, note: args.note?.trim() || undefined };
  if (target) await ctx.db.patch(target._id, details);
  else await ctx.db.insert("matchEvents", {
    matchId: args.matchId, ...details, quarter: match.currentQuarter,
    timestamp, ...stamp, matchMs: stamp.gameSecond * 1000,
    correlationId: args.correlationId, commandType: "MOBILE_EVENT", createdAt: now,
  });
  return { deduped: false };
}

export const mobileEventCommand = mutation({ args: eventCommandArgs, returns: v.object({ deduped: v.boolean() }), handler: executeEventCommand });
