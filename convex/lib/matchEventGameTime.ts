const REGULATION_MINUTES = 60;

type MatchClockSnapshot = {
  currentQuarter: number;
  quarterCount: number;
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

function getQuarterDurationSeconds(quarterCount: number): number {
  return Math.max(1, Math.floor((REGULATION_MINUTES * 60) / quarterCount));
}

/**
 * If the clock is paused, events should use the pause moment as effective time.
 */
export function getEffectiveEventTime(
  match: MatchClockSnapshot,
  now: number
): number {
  return match.pausedAt ?? now;
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
  const quarterDurationSeconds = getQuarterDurationSeconds(match.quarterCount);
  return Math.max(0, elapsedQuarterSeconds - quarterDurationSeconds);
}

/**
 * Returns football-style event timing fields.
 *
 * displayMinute is zero-based by design:
 * - 0 means 0'
 * - 10 means 10'
 */
export function buildEventGameTimeStamp(
  match: MatchClockSnapshot,
  effectiveTime: number
): EventGameTimeStamp {
  const quarterDurationSeconds = getQuarterDurationSeconds(match.quarterCount);
  const regulationSeconds = REGULATION_MINUTES * 60;
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
