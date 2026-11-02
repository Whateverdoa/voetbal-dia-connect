export type RefereeDisplayClock = {
  interruptionTiming?: { period: number; measuredMs: number; activeStartedElapsedMs?: number; active: boolean; needsReview: boolean; chosenSeconds?: number }[];
  elapsedMs: number;
  runningSince: number | null;
  periodStartedElapsedMs?: number;
  safetyMarginMinutes?: number;
  clockReviewReason?: "period_limit" | "long_stoppage" | "unknown_anchor";
  limitElapsedMs?: number;
};

export type MatchClockStatus = "scheduled" | "lineup" | "live" | "halftime" | "finished";

export type MatchClockSnapshot = {
  refereeClock?: RefereeDisplayClock;
  currentQuarter: number;
  quarterCount: number;
  regulationDurationMinutes?: number;
  quarterStartedAt?: number;
  frozenClockMs?: number;
  status: MatchClockStatus;
};
