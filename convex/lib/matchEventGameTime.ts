import { resolveRegulationMinutes } from "./matchTiming";

type MatchClockSnapshot = {
  currentQuarter: number;
  quarterCount: number;
  regulationDurationMinutes?: number;
  quarterStartedAt?: number;
  pausedAt?: number;
  accumulatedPauseTime?: number;
  bankedOverrunSeconds?: number;
};

export type EventGameTimeStamp = {
  gameSecond: number;
  displayMinute: number;
  displayExtraMinute?: number;
};

function getQuarterDurationSeconds(match: MatchClockSnapshot): number {
  const regulation = resolveRegulationMinutes(match);
  return Math.max(1, Math.floor((regulation * 60) / match.quarterCount));
}

function getQuarterDurationMs(match: MatchClockSnapshot): number {
  return getQuarterDurationSeconds(match) * 1000;
}

export function getEffectiveEventTime(
  match: MatchClockSnapshot,
  now: number
): number {
  return match.pausedAt ?? now;
}

export function getQuarterEndTimeWithPausedFallback(
  match: MatchClockSnapshot,
  now: number
): number {
  const effectiveTime = getEffectiveEventTime(match, now);
  if (match.pausedAt == null || !match.quarterStartedAt) {
    return effectiveTime;
  }

  const expectedQuarterEndAt =
    match.quarterStartedAt +
    (match.accumulatedPauseTime ?? 0) +
    getQuarterDurationMs(match);

  return Math.max(effectiveTime, expectedQuarterEndAt);
}

function getElapsedQuarterSeconds(
  match: MatchClockSnapshot,
  effectiveTime: number
): number {
  if (!match.quarterStartedAt) {
    return 0;
  }

  const elapsedMs =
    effectiveTime -
    match.quarterStartedAt -
    (match.accumulatedPauseTime ?? 0);

  return Math.max(0, Math.floor(elapsedMs / 1000));
}

export function computeQuarterOverrunSeconds(
  match: MatchClockSnapshot,
  effectiveTime: number
): number {
  const elapsedQuarterSeconds = getElapsedQuarterSeconds(match, effectiveTime);
  const quarterDurationSeconds = getQuarterDurationSeconds(match);
  return Math.max(0, elapsedQuarterSeconds - quarterDurationSeconds);
}

export function buildEventGameTimeStamp(
  match: MatchClockSnapshot,
  effectiveTime: number
): EventGameTimeStamp {
  const quarterDurationSeconds = getQuarterDurationSeconds(match);
  const regulationSeconds = resolveRegulationMinutes(match) * 60;
  const quarterOffsetSeconds =
    Math.max(0, match.currentQuarter - 1) * quarterDurationSeconds;
  const elapsedQuarterSeconds = getElapsedQuarterSeconds(match, effectiveTime);
  const clampedQuarterSeconds = Math.min(
    elapsedQuarterSeconds,
    quarterDurationSeconds
  );
  const overrunQuarterSeconds = Math.max(
    0,
    elapsedQuarterSeconds - quarterDurationSeconds
  );

  const gameSecond = quarterOffsetSeconds + clampedQuarterSeconds;
  const isFinalQuarter = match.currentQuarter >= match.quarterCount;
  const hasReachedRegulation = gameSecond >= regulationSeconds;
  const carriedOverrunSeconds =
    isFinalQuarter && hasReachedRegulation ? match.bankedOverrunSeconds ?? 0 : 0;
  const totalExtraSeconds = overrunQuarterSeconds + carriedOverrunSeconds;

  return {
    gameSecond,
    displayMinute: Math.floor(gameSecond / 60),
    displayExtraMinute:
      totalExtraSeconds > 0 ? Math.ceil(totalExtraSeconds / 60) : undefined,
  };
}
