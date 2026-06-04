"use client";

import { formatElapsed, useMatchClock } from "@/lib/matchClock";
import type { MatchStatus } from "./types";

interface MatchClockProps {
  currentQuarter: number;
  quarterCount: number;
  /** Total regulation minutes (excl. halftime). Default 60. */
  regulationDurationMinutes?: number;
  quarterStartedAt?: number;
  pausedAt?: number;
  accumulatedPauseTime?: number;
  frozenClockMs?: number;
  status: MatchStatus;
  className?: string;
}

export { formatElapsed };

/**
 * Real-time match clock showing elapsed time in global match time.
 * Quarter anchors:
 * - Q1 starts at 00:00
 * - Q2 starts at 15:00 (for 4 quarters)
 * - Q3 starts at 30:00
 * - Q4 starts at 45:00 (for 60-minute regulation / 4 periods)
 * For 2 halves of 30', anchors are 00:00 and 30:00; for 2×45', anchors are 00:00 and 45:00.
 *
 * Interruption tracking no longer pauses the main clock. Players' minutes can
 * freeze during an interruption, but the visible match clock keeps running.
 */
export function MatchClock({
  currentQuarter,
  quarterCount,
  regulationDurationMinutes = 60,
  quarterStartedAt,
  frozenClockMs,
  status,
  className = "",
}: MatchClockProps) {
  const { display, isRunning, hasClock } = useMatchClock({
    currentQuarter,
    quarterCount,
    regulationDurationMinutes,
    quarterStartedAt,
    frozenClockMs,
    status,
  });

  return (
    <span
      className={`tabular-nums ${isRunning ? "text-white/80" : "text-white/75"} ${className}`}
      aria-label={
        hasClock
            ? `Speeltijd: ${display}`
            : "Klok gestopt"
      }
    >
      {display}
    </span>
  );
}
