import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { cardPersonDisplay } from "./cardEntry";
import { applyGoalEnrichments } from "./matchEventProjection";

export const OFFICIAL_LOG_TYPES = [
  "goal",
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
    timestamp: event.timestamp,
    playerName: cardPersonDisplay({
      playerName: rosterName,
      reportedName: event.reportedName,
      reportedNumber: event.reportedNumber,
    }),
    isOwnGoal: event.isOwnGoal,
    isOpponentGoal: event.isOpponentGoal,
    isOpponentCard: event.isOpponentCard,
    note: event.note,
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
  const official = applyGoalEnrichments(events).filter((event) => isOfficialLogType(event.type));
  const playerIds = official
    .map((event) => event.playerId)
    .filter((id): id is NonNullable<typeof id> => id != null);
  const uniqueIds = [...new Set(playerIds)];
  const players = await Promise.all(uniqueIds.map((id) => ctx.db.get(id)));
  const playerNameById: Record<string, string> = {};
  for (const player of players) {
    if (player) playerNameById[String(player._id)] = player.name;
  }
  return official.map((event) => mapOfficialLogEvent(event, playerNameById));
}
