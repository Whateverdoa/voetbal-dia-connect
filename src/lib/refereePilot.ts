import { makeFunctionReference, type PaginationResult } from "convex/server";
import type { Infer } from "convex/values";
import type { Id } from "@/convex/_generated/dataModel";
import type { RefereeDetail, timelineEvent } from "@/convex/lib/refereeMatchRead";
import type { RefereeAction } from "@/convex/lib/refereeRegistrationContract";
export type { RefereeDetail, RefereeAction };
export type PilotEvent = Infer<typeof timelineEvent>;
export type PilotReceipt = { commandEventId: Id<"matchEvents">; commandCorrelationId: string; version: number };
export type PilotCommand = { actorSubject: string; matchId: Id<"matches">; expectedVersion: number; correlationId: string; action: RefereeAction };
export const pilotMatchQuery = makeFunctionReference<"query", { matchId: Id<"matches"> }, RefereeDetail | null>("refereeRegistration:getMatch");
export const pilotTimelineQuery = makeFunctionReference<"query", { matchId: Id<"matches">; paginationOpts: { numItems: number; cursor: string | null } }, PaginationResult<PilotEvent>>("refereeRegistration:timeline");
export const pilotCommandMutation = makeFunctionReference<"mutation", PilotCommand, PilotReceipt>("refereeRegistration:command");

/** Project cached snapshots locally; never let a cached running clock exceed its cap. */
export function projectPilotClock(match: RefereeDetail, now: number) {
  const clock = match.clock;
  if (!clock) return { elapsedMs: 0, remainingMs: 0, reason: "unknown_anchor", version: match.version, running: false };
  const observed = clock.elapsedMs + (clock.runningSince === null ? 0 : Math.max(0, now - clock.runningSince));
  const atLimit = clock.clockLimitElapsedMs !== undefined && observed >= clock.clockLimitElapsedMs;
  const longStop = clock.stoppageStartedAt !== undefined && now - clock.stoppageStartedAt >= 15 * 60_000;
  const elapsedMs = Math.min(observed, clock.clockLimitElapsedMs ?? clock.elapsedMs);
  const reason = clock.clockReviewReason === "unknown_anchor" ? "unknown_anchor" : atLimit ? "period_limit" : longStop ? "long_stoppage" : clock.clockReviewReason;
  const pendingGuard = !match.clockGuardPending && (
    (atLimit && clock.runningSince !== null) || (longStop && clock.clockReviewReason !== "long_stoppage")
  );
  return { elapsedMs, remainingMs: Math.max(0, match.periodMinutes * 60_000 - (elapsedMs - (clock.periodStartedElapsedMs ?? elapsedMs))),
    reason, version: match.version + (pendingGuard ? 1 : 0), running: clock.runningSince !== null && !atLimit && reason !== "unknown_anchor" };
}
