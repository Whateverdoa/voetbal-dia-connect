import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { cardPersonDisplay } from "./cardEntry";
import { applyGoalEnrichments, applyIncidentAnnotations } from "./matchEventProjection";

export const OFFICIAL_LOG_TYPES = [
  "goal",
  "goal_correction",
  "incident",
  "yellow_card",
  "red_card",
] as const;

export type OfficialLogType = (typeof OFFICIAL_LOG_TYPES)[number];

export function isOfficialLogType(type: string): type is OfficialLogType {
  return (OFFICIAL_LOG_TYPES as readonly string[]).includes(type);
}

export function mapOfficialLogEvent(
  event: Doc<"matchEvents">,
  playerNameById: Record<string, string>,
) {
  const rosterName = event.playerId
    ? playerNameById[String(event.playerId)]
    : undefined;
  return {
    _id: event._id,
    type: event.type,
    quarter: event.quarter,
    matchMs: event.matchMs,
    targetEventId: event.targetEventId,
    timestamp: event.timestamp,
    playerName: event.type === "incident" ? undefined : cardPersonDisplay({
      playerName: rosterName,
      reportedName: event.reportedName,
      reportedNumber: event.reportedNumber,
    }),
    isOwnGoal: event.isOwnGoal,
    isOpponentGoal: event.isOpponentGoal,
    isOpponentCard: event.isOpponentCard,
    incidentCategory: event.type === "incident" ? ["Blessure", "Strafschop", "Wangedrag", "Publiek", "Overig"].find(c => event.note?.startsWith(c + ":")) ?? "Overig" : undefined,
    note: event.type === "incident" ? undefined : event.note,
    assistKind: event.assistKind,
    displayMinute: event.displayMinute,
    displayExtraMinute: event.displayExtraMinute,
  };
}

export async function listOfficialMatchEvents(
  ctx: QueryCtx,
  matchId: Id<"matches">,
) {
  const events = await ctx.db
    .query("matchEvents")
    .withIndex("by_match", (q) => q.eq("matchId", matchId))
    .order("desc")
    .take(1000);
  events.reverse();
  // A coach enriches the same goal after the referee records the score.
  const annotated = applyIncidentAnnotations(events);
  const official = applyGoalEnrichments(annotated).filter((event) => isOfficialLogType(event.type));
  const playerIds = official
    .map((event) => event.playerId)
    .filter((id): id is NonNullable<typeof id> => id != null);
  const uniqueIds = [...new Set(playerIds)];
  const players = await Promise.all(uniqueIds.map((id) => ctx.db.get(id)));
  const playerNameById: Record<string, string> = {};
  for (const player of players) {
    if (player) playerNameById[String(player._id)] = player.name;
  }
  const corrected = new Set(events.filter(event => event.type === "goal_correction").map(event => event.targetEventId));
  return official.map((event) => ({ ...mapOfficialLogEvent(event, playerNameById),
    corrected: event.type === "goal" && corrected.has(event._id) }));

}
