import { makeFunctionReference, type PaginationOptions } from "convex/server";
import type { Infer } from "convex/values";
import type { Id } from "@/convex/_generated/dataModel";
import type { RefereeDetail, timelineEvent } from "@/convex/lib/refereeMatchRead";
import type { RefereeAction } from "@/convex/lib/refereeRegistrationContract";
export type OfficialIntent = { matchId: Id<"matches">; expectedVersion: number; correlationId: string; actorSubject: string; action: RefereeAction };
export type OfficialReceipt = { commandEventId: Id<"matchEvents">; commandCorrelationId: string; version: number };
export type OfficialTimelineEvent = Infer<typeof timelineEvent>;
// Typed references preserve the existing generated API checkpoint without hand-editing it.
export const refereePolicyApi = {
  getMatch: makeFunctionReference<"query", { matchId: Id<"matches"> }, RefereeDetail>("mobileReferee:getMatch"),
  timeline: makeFunctionReference<"query", { matchId: Id<"matches">; paginationOpts: PaginationOptions }, { page: OfficialTimelineEvent[]; isDone: boolean; continueCursor: string }>("mobileReferee:timeline"),
  command: makeFunctionReference<"mutation", OfficialIntent, OfficialReceipt>("mobileReferee:command"),
};
export function clockReviewReason(value?: string) {
  return value === undefined ? undefined : value === "period_limit" || value === "long_stoppage" ? value : "unknown_anchor" as const;
}
