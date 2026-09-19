import { v } from "convex/values";
import type { Doc } from "../_generated/dataModel";

export const eventKindValidator = v.union(v.literal("goal"), v.literal("corner"), v.literal("free_kick"), v.literal("yellow_card"), v.literal("red_card"), v.literal("second_yellow"));
export const eventSideValidator = v.union(v.literal("dia"), v.literal("opponent"));
export const assistStatusValidator = v.union(v.literal("none"), v.literal("unknown"), v.literal("player"));
export const countsValidator = v.object({ goals: v.number(), assists: v.number(), corners: v.number(), freeKicks: v.number(), yellowCards: v.number(), redCards: v.number() });
export const eventRowValidator = v.object({
  id: v.id("matchEvents"), kind: eventKindValidator, side: eventSideValidator,
  playerId: v.optional(v.id("players")), playerName: v.optional(v.string()),
  opponentNumber: v.optional(v.number()), assistPlayerId: v.optional(v.id("players")),
  assistName: v.optional(v.string()), assistStatus: v.optional(assistStatusValidator),
  assistKind: v.optional(v.union(v.literal("pass"), v.literal("corner"), v.literal("free_kick"))),
  note: v.optional(v.string()), quarter: v.number(), displayMinute: v.optional(v.number()),
  displayExtraMinute: v.optional(v.number()), editable: v.boolean(),
});

export function eventKind(event: Doc<"matchEvents">) {
  if (event.type === "red_card" && event.cardReason === "second_yellow") return "second_yellow" as const;
  switch (event.type) {
    case "goal": case "corner": case "free_kick": case "yellow_card": case "red_card": return event.type;
    default: return null;
  }
}
export function eventSide(event: Doc<"matchEvents">): "dia" | "opponent" {
  return event.side ?? (event.isOpponentGoal || event.isOwnGoal ? "opponent" : "dia");
}
export function isEditableEvent(event: Doc<"matchEvents">) {
  return !!eventKind(event) && !event.isOwnGoal && (event.commandType === "MOBILE_EVENT" || (event.type === "goal" && event.commandType === "ADJUST_SCORE"));
}
export function eventTotals(events: Doc<"matchEvents">[]) {
  const empty = () => ({ goals: 0, assists: 0, corners: 0, freeKicks: 0, yellowCards: 0, redCards: 0 });
  const result = { dia: empty(), opponent: empty() };
  for (const event of events) {
    const totals = result[eventSide(event)];
    switch (eventKind(event)) {
      case "goal": totals.goals++; if (event.relatedPlayerId) totals.assists++; break;
      case "corner": totals.corners++; break;
      case "free_kick": totals.freeKicks++; break;
      case "yellow_card": totals.yellowCards++; break;
      case "red_card": totals.redCards++; break;
      case "second_yellow": totals.yellowCards++; totals.redCards++; break;
    }
  }
  return result;
}
