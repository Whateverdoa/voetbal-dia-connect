import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import { LONG_STOPPAGE_MS, playingElapsedMs } from "./officialMatchClock";
import { projectRefereeClock } from "./refereeMatchPolicy";

export type StoppageDisposition = "include" | "discard";
export type RefereeClockCommand =
  | { kind: "start" | "pause" | "start_period" }
  | { kind: "resume" | "end_period" | "finish"; stoppageDisposition?: StoppageDisposition }
  | { kind: "set_safety_margin"; safetyMarginMinutes: number }
  | { kind: "configure"; periodCount: number; periodMinutes: number; safetyMarginMinutes: number };

/** Pure shared rules; the transaction caller must authenticate, audit and save. */
export function applyRefereeClockCommand(source: Doc<"matches">, action: RefereeClockCommand, now: number) {
  const projection = projectRefereeClock(source, now);
  if (!projection || !source.refereePolicy) throw new ConvexError("CLOCK_POLICY_REQUIRED");
  const clock = projection.state;
  const next = { ...source, refereePolicy: { ...source.refereePolicy, elapsedMs: playingElapsedMs(clock, now),
    runningSince: clock.runningSince === null ? null : now,
    clockReviewReason: clock.clockReviewReason, clockLimitAt: clock.clockLimitAt, clockLimitElapsedMs: clock.clockLimitElapsedMs,
    stoppageStartedAt: clock.stoppageStartedAt } };
  const policy = next.refereePolicy;
  let observedStoppageMs: number | undefined;
  const closeStoppage = (disposition?: StoppageDisposition) => {
    if (policy.stoppageStartedAt === undefined) return;
    observedStoppageMs = Math.max(0, now - policy.stoppageStartedAt);
    if (observedStoppageMs >= LONG_STOPPAGE_MS && disposition === undefined) throw new ConvexError("STOPPAGE_REVIEW_REQUIRED");
    if (disposition !== "discard") policy.confirmedStoppageMs += observedStoppageMs;
    policy.stoppageStartedAt = undefined;
  };
  const startRunning = () => {
    if (policy.clockReviewReason === "unknown_anchor") throw new ConvexError("CLOCK_REVIEW_REQUIRED");
    const limit = policy.periodStartedElapsedMs! + ((next.regulationDurationMinutes ?? 60) / next.quarterCount + policy.safetyMarginMinutes) * 60_000;
    if (policy.elapsedMs >= limit) throw new ConvexError("CLOCK_REVIEW_REQUIRED");
    policy.runningSince = now;
    policy.clockReviewReason = undefined;
  };
  switch (action.kind) {
    case "configure":
      if (!["scheduled", "lineup"].includes(next.status) || next.startedAt !== undefined) throw new ConvexError("MATCH_ALREADY_STARTED");
      if (![2, 4].includes(action.periodCount) || !Number.isInteger(action.periodMinutes) || action.periodMinutes < 1 || action.periodMinutes > 60 ||
          !Number.isInteger(action.safetyMarginMinutes) || action.safetyMarginMinutes < 0 || action.safetyMarginMinutes > 30) throw new ConvexError("VALIDATION_ERROR");
      next.quarterCount = action.periodCount;
      next.regulationDurationMinutes = action.periodCount * action.periodMinutes;
      policy.safetyMarginMinutes = action.safetyMarginMinutes;
      break;
    case "start":
      if (!["scheduled", "lineup"].includes(next.status) || next.startedAt !== undefined || policy.elapsedMs !== 0 || next.currentQuarter !== 1) throw new ConvexError("MATCH_ALREADY_STARTED");
      next.status = "live";
      next.startedAt = now;
      policy.periodStartedElapsedMs = 0;
      startRunning();
      break;
    case "pause":
      if (next.status !== "live" || policy.runningSince === null) throw new ConvexError("CLOCK_NOT_RUNNING");
      policy.runningSince = null;
      policy.stoppageStartedAt = now;
      break;
    case "resume":
      if (next.status !== "live" || policy.runningSince !== null) throw new ConvexError("CLOCK_NOT_PAUSED");
      closeStoppage(action.stoppageDisposition);
      startRunning();
      break;
    case "end_period":
      if (next.status !== "live") throw new ConvexError("PERIOD_NOT_LIVE");
      closeStoppage(action.stoppageDisposition);
      policy.runningSince = null;
      next.status = next.currentQuarter === next.quarterCount ? "finished" : "halftime";
      if (next.status === "finished") next.finishedAt = now;
      break;
    case "start_period":
      if (next.status !== "halftime" || next.currentQuarter >= next.quarterCount || policy.clockReviewReason === "unknown_anchor") throw new ConvexError("CLOCK_REVIEW_REQUIRED");
      next.currentQuarter += 1;
      next.status = "live";
      policy.periodStartedElapsedMs = policy.elapsedMs;
      policy.confirmedStoppageMs = 0;
      policy.stoppageStartedAt = undefined;
      startRunning();
      break;
    case "finish":
      if (next.status === "finished" || ["scheduled", "lineup"].includes(next.status)) throw new ConvexError("MATCH_NOT_ACTIVE");
      closeStoppage(action.stoppageDisposition);
      policy.runningSince = null;
      next.status = "finished";
      next.finishedAt = now;
      break;
    case "set_safety_margin":
      if (!Number.isInteger(action.safetyMarginMinutes) || action.safetyMarginMinutes < 0 || action.safetyMarginMinutes > 30 ||
          next.status === "finished" || (next.startedAt !== undefined && action.safetyMarginMinutes < policy.safetyMarginMinutes)) throw new ConvexError("VALIDATION_ERROR");
      policy.safetyMarginMinutes = action.safetyMarginMinutes;
      break;
  }
  const guarded = projectRefereeClock(next, now)!.state;
  policy.elapsedMs = guarded.elapsedMs;
  policy.runningSince = guarded.runningSince;
  policy.stoppageStartedAt = guarded.stoppageStartedAt;
  policy.clockReviewReason = guarded.clockReviewReason;
  policy.clockLimitAt = guarded.clockLimitAt;
  policy.clockLimitElapsedMs = guarded.clockLimitElapsedMs;
  return { match: next, observedStoppageMs, stoppageDisposition: "stoppageDisposition" in action ? action.stoppageDisposition : undefined,
    guardBeforeCommand: projection.changed ? projection : null };
}
