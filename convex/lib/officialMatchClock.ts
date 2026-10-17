export const DEFAULT_SAFETY_MARGIN_MINUTES = 10;
export const LONG_STOPPAGE_MS = 15 * 60_000;
export type ClockReviewReason = "period_limit" | "long_stoppage" | "unknown_anchor";

export interface OfficialClock {
  status: string;
  period: number;
  periodCount: number;
  periodMinutes: number;
  safetyMarginMinutes?: number;
  elapsedMs: number;
  runningSince: number | null;
  periodStartedElapsedMs?: number;
  stoppageStartedAt?: number;
  clockReviewReason?: ClockReviewReason;
  clockLimitElapsedMs?: number;
  clockLimitAt?: number;
}

export function safetyMarginMinutes(clock: OfficialClock): number {
  const value = clock.safetyMarginMinutes;
  return value !== undefined && Number.isInteger(value) && value >= 0 && value <= 30
    ? value : DEFAULT_SAFETY_MARGIN_MINUTES;
}

export function observedStoppageMs(clock: OfficialClock, now: number): number | undefined {
  return clock.stoppageStartedAt === undefined ? undefined : Math.max(0, now - clock.stoppageStartedAt);
}

export function playingElapsedMs(clock: OfficialClock, now: number): number {
  return clock.elapsedMs + (clock.runningSince === null ? 0 : Math.max(0, now - clock.runningSince));
}

// A read-only projection and a mutation use exactly the same cutoff, never reopen time.
export function guardOfficialClock<T extends OfficialClock>(source: T, now: number) {
  const state = { ...source, safetyMarginMinutes: safetyMarginMinutes(source) };
  const observedElapsedMs = playingElapsedMs(source, now);
  const rawStoppageMs = observedStoppageMs(source, now);
  let effectiveAt: number | undefined;
  state.clockReviewReason = undefined;
  state.clockLimitElapsedMs = undefined;
  state.clockLimitAt = undefined;
  if (["live", "break", "interrupted"].includes(state.status)) {
    const anchor = state.periodStartedElapsedMs;
    // A claimed anchor cannot contain more than the maximum permitted prior play.
    const maximumPriorElapsedMs = (state.period - 1) * (state.periodMinutes + 30) * 60_000;
    if (anchor === undefined || !Number.isFinite(anchor) || anchor < 0 || anchor > state.elapsedMs ||
        !Number.isInteger(state.periodCount) || state.periodCount < 1 || state.periodCount > 4 ||
        !Number.isInteger(state.period) || state.period < 1 || state.period > state.periodCount || anchor > maximumPriorElapsedMs ||
        !Number.isFinite(state.periodMinutes) || state.periodMinutes < 1 || state.periodMinutes > 60 ||
        !Number.isFinite(state.elapsedMs) || (state.runningSince !== null && !Number.isFinite(state.runningSince)) ||
        (state.stoppageStartedAt !== undefined && !Number.isFinite(state.stoppageStartedAt))) {
      state.runningSince = null;
      state.clockReviewReason = "unknown_anchor";
      effectiveAt = now;
    } else {
      const limit = anchor + (state.periodMinutes + state.safetyMarginMinutes) * 60_000;
      state.clockLimitElapsedMs = limit;
      if (source.runningSince !== null) {
        state.clockLimitAt = source.runningSince + Math.max(0, limit - source.elapsedMs);
      }
      if (observedElapsedMs >= limit) {
        state.elapsedMs = limit;
        state.runningSince = null;
        state.clockReviewReason = "period_limit";
        state.clockLimitAt ??= source.clockReviewReason === "period_limit" ? source.clockLimitAt : undefined;
        effectiveAt = state.clockLimitAt;
        if (source.runningSince !== null) state.stoppageStartedAt = undefined;
      } else if (rawStoppageMs !== undefined && rawStoppageMs >= LONG_STOPPAGE_MS) {
        state.clockReviewReason = "long_stoppage";
        effectiveAt = source.stoppageStartedAt! + LONG_STOPPAGE_MS;
      }
    }
  }
  const changed = state.clockReviewReason !== undefined && (
    source.clockReviewReason !== state.clockReviewReason || source.runningSince !== state.runningSince ||
    !Object.is(source.elapsedMs, state.elapsedMs)
  );
  return { state, changed, effectiveAt, observedElapsedMs, observedStoppageMs: rawStoppageMs };
}

export function nextOfficialClockGuardAt(clock: OfficialClock, now: number): number | undefined {
  if (!["live", "break", "interrupted"].includes(clock.status)) return undefined;
  if (clock.clockReviewReason === "unknown_anchor" || clock.clockReviewReason === "period_limit") return undefined;
  if (clock.runningSince !== null) return clock.clockLimitAt ?? now;
  if (clock.stoppageStartedAt !== undefined && clock.clockReviewReason !== "long_stoppage") {
    return clock.stoppageStartedAt + LONG_STOPPAGE_MS;
  }
  return undefined;
}
