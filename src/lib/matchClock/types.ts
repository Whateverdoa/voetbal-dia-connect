export type MatchClockStatus = "scheduled" | "lineup" | "live" | "halftime" | "finished";
export type PublicRefereeClock = { elapsedMs: number; runningSince: number | null; limitElapsedMs?: number };

export type MatchClockSnapshot = {
  currentQuarter: number;
  quarterCount: number;
  regulationDurationMinutes?: number;
  quarterStartedAt?: number;
  frozenClockMs?: number;
  status: MatchClockStatus;
  refereeClock?: PublicRefereeClock;
};
