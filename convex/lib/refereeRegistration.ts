import { ConvexError } from "convex/values";
import type { MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";
import { officialDutyEligibility, pilotIdentity } from "./mobilePilotAccess";
import { enforceRefereeClock, projectRefereeClock, saveRefereeClock } from "./refereeMatchPolicy";
import { applyRefereeClockCommand } from "./refereeClockCommands";
import { playingElapsedMs } from "./officialMatchClock";
import { isUnavailable } from "./matchPlayerAvailability";
import type { RefereeAction } from "./refereeRegistrationContract";

// Canonical JSON makes object key order irrelevant, but not changed content.
function fingerprint(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(fingerprint).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.entries(value)
    .filter(([, item]) => item !== undefined).sort(([a], [b]) => a.localeCompare(b))
    .map(([key, item]) => `${JSON.stringify(key)}:${fingerprint(item)}`).join(",")}}`;
  return JSON.stringify(value);
}

async function selectedPlayer(ctx: MutationCtx, match: Doc<"matches">, id: Id<"players">) {
  const player = await ctx.db.get(id);
  const selection = await ctx.db.query("matchPlayers").withIndex("by_match_player", q => q.eq("matchId", match._id).eq("playerId", id)).unique();
  if (!player?.active || player.teamId !== match.teamId || !selection || isUnavailable(selection)) throw new ConvexError("PLAYER_NOT_AVAILABLE_FOR_MATCH");
}
function ownSide(match: Doc<"matches">, team: "home" | "away") {
  return match.isHome ? team === "home" : team === "away";
}
async function goalPlayers(ctx: MutationCtx, match: Doc<"matches">, opponent: boolean, ownGoal: boolean,
  scorerId?: Id<"players">, assistId?: Id<"players">) {
  if (ownGoal && !opponent) throw new ConvexError("OWN_GOAL_SIDE_MISMATCH");
  if (scorerId) {
    if (opponent && !ownGoal) throw new ConvexError("PLAYER_TEAM_SIDE_MISMATCH");
    await selectedPlayer(ctx, match, scorerId);
  }
  if (assistId) {
    if (opponent || ownGoal) throw new ConvexError("PLAYER_TEAM_SIDE_MISMATCH");
    await selectedPlayer(ctx, match, assistId);
  }
}
async function targetGoal(ctx: MutationCtx, match: Doc<"matches">, eventId: Id<"matchEvents">) {
  const event = await ctx.db.get(eventId);
  if (!event || event.matchId !== match._id || event.type !== "goal") throw new ConvexError("GOAL_NOT_FOUND");
  return event;
}
function validateAnnotation(action: RefereeAction) {
  if ("note" in action && action.note !== undefined && action.note.length > 2000) throw new ConvexError("VALIDATION_ERROR");
  if ("reportedName" in action && action.reportedName !== undefined && action.reportedName.length > 200) throw new ConvexError("VALIDATION_ERROR");
  if ("reportedNumber" in action && action.reportedNumber !== undefined && (!Number.isInteger(action.reportedNumber) || action.reportedNumber < 0 || action.reportedNumber > 999)) throw new ConvexError("VALIDATION_ERROR");
}

/** Shared transaction core, not a public endpoint. Mobile scope is an additional
 * wrapper requirement, never a replacement for current official-duty rights. */
export async function executeRefereeRegistration(ctx: MutationCtx, args: {
  matchId: Id<"matches">; expectedVersion: number; correlationId: string; action: RefereeAction;
}) {
  const actor = await pilotIdentity(ctx);
  let match = await ctx.db.get(args.matchId);
  if (!match?.refereePolicy) throw new ConvexError("PILOT_POLICY_REQUIRED");
  const duty = await officialDutyEligibility(ctx, match, actor.access);
  if (!duty.isOfficialRegistrar || match.cancelledAt !== undefined) throw new ConvexError("OFFICIAL_REGISTRATOR_REQUIRED");
  if (!args.correlationId.trim() || args.correlationId.length > 200 || !Number.isSafeInteger(args.expectedVersion) || args.expectedVersion < 0) throw new ConvexError("VALIDATION_ERROR");
  validateAnnotation(args.action);
  const commandType = `OFFICIAL_${args.action.kind.toUpperCase()}`;
  const content = fingerprint({ action: args.action, expectedVersion: args.expectedVersion });
  const previous = await ctx.db.query("matchCommandDedupes").withIndex("by_match_command_correlation", q =>
    q.eq("matchId", args.matchId).eq("commandType", commandType).eq("correlationId", args.correlationId)).unique();
  if (previous) {
    if (previous.actorSubject !== actor.subject || previous.fingerprint !== content) throw new ConvexError("CORRELATION_CONTENT_MISMATCH");
    if (!previous.commandEventId || previous.commandVersion === undefined) throw new ConvexError("INVALID_RECEIPT");
    return { commandEventId: previous.commandEventId, commandCorrelationId: args.correlationId, version: previous.commandVersion };
  }
  const now = Date.now();
  const projected = projectRefereeClock(match, now)!;
  // Queries and commands can predict the same guard version before a delayed job.
  const effectiveVersion = match.refereePolicy.commandVersion + (projected.changed ? 1 : 0);
  if (args.expectedVersion !== effectiveVersion) throw new ConvexError("VERSION_CONFLICT");
  if (projected.changed) {
    await enforceRefereeClock(ctx, match, now);
    match = (await ctx.db.get(args.matchId))!;
  }
  const action = args.action;
  const metadataOnly = action.kind === "enrich_goal" || action.kind === "annotate_event";
  if (!metadataOnly && ["goal", "correct_goal", "yellow_card", "red_card", "incident"].includes(action.kind) && !["live", "halftime"].includes(match.status)) throw new ConvexError("MATCH_NOT_ACTIVE");
  const base = { matchId: match._id, quarter: match.currentQuarter, matchMs: playingElapsedMs(projectRefereeClock(match, now)!.state, now),
    timestamp: now, createdAt: now, actorKind: "user" as const, actorSubject: actor.subject, correlationId: args.correlationId, commandType };
  let event: Omit<Doc<"matchEvents">, "_id" | "_creationTime"> = { ...base, type: "official_audit" };
  let nextPolicy = { ...match.refereePolicy! };
  switch (action.kind) {
    case "goal": {
      const opponent = !ownSide(match, action.team);
      await goalPlayers(ctx, match, opponent, action.isOwnGoal === true, action.scorerId, action.assistId);
      await ctx.db.patch(match._id, action.team === "home" ? { homeScore: match.homeScore + 1 } : { awayScore: match.awayScore + 1 });
      event = { ...base, type: "goal", playerId: action.scorerId, relatedPlayerId: action.assistId, isOpponentGoal: opponent, isOwnGoal: action.isOwnGoal };
      break;
    }
    case "correct_goal": {
      const goal = await targetGoal(ctx, match, action.eventId);
      const corrected = await ctx.db.query("matchEvents").withIndex("by_match_and_target_and_type", q =>
        q.eq("matchId", match!._id).eq("targetEventId", goal._id).eq("type", "goal_correction")).first();
      if (corrected) throw new ConvexError("GOAL_ALREADY_CORRECTED");
      const home = goal.isOpponentGoal ? !match.isHome : match.isHome;
      const score = home ? match.homeScore : match.awayScore;
      if (score < 1) throw new ConvexError("SCORE_CONFLICT");
      await ctx.db.patch(match._id, home ? { homeScore: score - 1 } : { awayScore: score - 1 });
      event = { ...base, type: "goal_correction", targetEventId: goal._id };
      break;
    }
    case "enrich_goal": {
      const goal = await targetGoal(ctx, match, action.eventId);
      if (action.scorerId === undefined && action.assistId === undefined) throw new ConvexError("VALIDATION_ERROR");
      await goalPlayers(ctx, match, goal.isOpponentGoal === true, goal.isOwnGoal === true, action.scorerId, action.assistId);
      event = { ...base, type: "goal_enrichment", quarter: goal.quarter, targetEventId: goal._id, playerId: action.scorerId, relatedPlayerId: action.assistId };
      break;
    }
    case "yellow_card": case "red_card": {
      const opponent = !ownSide(match, action.team);
      if (action.playerId) {
        if (opponent) throw new ConvexError("PLAYER_TEAM_SIDE_MISMATCH");
        await selectedPlayer(ctx, match, action.playerId);
      }
      event = { ...base, type: action.kind, playerId: action.playerId, isOpponentCard: opponent,
        reportedName: action.reportedName?.trim() || undefined, reportedNumber: action.reportedNumber };
      break;
    }
    case "incident":
      event = { ...base, type: "incident", note: action.note?.trim() || undefined };
      break;
    case "annotate_event": {
      const target = await ctx.db.get(action.eventId);
      if (!target || target.matchId !== match._id || !["yellow_card", "red_card", "incident"].includes(target.type)) throw new ConvexError("EVENT_NOT_FOUND");
      if (action.note === undefined && action.reportedName === undefined && action.reportedNumber === undefined) throw new ConvexError("VALIDATION_ERROR");
      event = { ...base, type: "official_annotation", targetEventId: target._id, note: action.note?.trim(), reportedName: action.reportedName?.trim(), reportedNumber: action.reportedNumber };
      break;
    }
    default: {
      const result = applyRefereeClockCommand(match, action, now);
      const next = result.match;
      await ctx.db.patch(match._id, { status: next.status, currentQuarter: next.currentQuarter, quarterCount: next.quarterCount,
        regulationDurationMinutes: next.regulationDurationMinutes, startedAt: next.startedAt, finishedAt: next.finishedAt,
        ...(action.kind === "start" || action.kind === "start_period" ? { quarterStartedAt: now } : {}) });
      nextPolicy = next.refereePolicy;
      event = { ...base, type: "official_audit", matchMs: nextPolicy.elapsedMs,
        observedStoppageMs: result.observedStoppageMs,
        stoppageStartedAt: result.observedStoppageMs !== undefined ? match.refereePolicy!.stoppageStartedAt : undefined,
        stoppageDisposition: result.stoppageDisposition,
        note: result.stoppageDisposition, effectiveAt: now };
    }
  }
  const version = effectiveVersion + 1;
  nextPolicy.commandVersion = version;
  const latest = (await ctx.db.get(match._id))!;
  await saveRefereeClock(ctx, { ...latest, refereePolicy: nextPolicy }, now);
  const commandEventId = await ctx.db.insert("matchEvents", event);
  await ctx.db.insert("matchCommandDedupes", { matchId: match._id, commandType, correlationId: args.correlationId, actorSubject: actor.subject,
    fingerprint: content, commandEventId, commandVersion: version, createdAt: now });
  return { commandEventId, commandCorrelationId: args.correlationId, version };
}
