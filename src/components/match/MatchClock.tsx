"use client";

import { formatElapsed, useMatchClock } from "@/lib/matchClock";
import type { RefereeDisplayClock } from "@/lib/matchClock";
import type { MatchStatus } from "./types";

interface MatchClockProps {
  refereeClock?: RefereeDisplayClock;
  currentQuarter: number;
  quarterCount: number;
  regulationDurationMinutes?: number;
  quarterStartedAt?: number;
  pausedAt?: number;
  accumulatedPauseTime?: number;
  frozenClockMs?: number;
  status: MatchStatus;
  className?: string;
}

export { formatElapsed };

/** Nominal period clock; actual playing time remains a separate ledger. */
export function MatchClock({
  refereeClock, currentQuarter, quarterCount, regulationDurationMinutes = 60,
  quarterStartedAt, frozenClockMs, status, className = "",
}: MatchClockProps) {
  const { display, isRunning, hasClock, actualElapsedMs, elapsedMs } = useMatchClock({
    refereeClock, currentQuarter, quarterCount, regulationDurationMinutes,
    quarterStartedAt, frozenClockMs, status,
  });
  return (
    <span className="inline-flex flex-col items-center gap-1">
      <span
        className={`tabular-nums ${isRunning ? "text-white/80" : "text-white/75"} ${className}`}
        aria-label={hasClock ? `Speeltijd: ${display}` : refereeClock ? "Klok controleren" : "Klok gestopt"}
      >
        {refereeClock && !hasClock ? "Klok controleren" : display}
      </span>
      {refereeClock?.interruptionTiming?.map(timing => {
        const openMs = timing.activeStartedElapsedMs === undefined || actualElapsedMs === null ? 0 : Math.min(900000, Math.max(0, actualElapsedMs - timing.activeStartedElapsedMs));
        const extraPlayed = elapsedMs === null ? 0 : Math.max(0, elapsedMs - timing.period * regulationDurationMinutes / quarterCount * 60000);
        return <span key={timing.period} className="block text-sm font-normal tabular-nums" data-testid="shared-interruption-timing">
          Periode {timing.period}: gemeten {formatElapsed(timing.measuredMs + openMs)}{timing.active ? " · meting open" : ""}
          {timing.chosenSeconds !== undefined && <> · Extra tijd {formatElapsed(timing.chosenSeconds * 1000)}{timing.period === currentQuarter && status === "live" ? ` · nog ${formatElapsed(Math.max(0, timing.chosenSeconds * 1000 - extraPlayed))}` : ""}</>}
          {(timing.needsReview || openMs >= 900000) && " · controle nodig"}
        </span>;
      })}
      {refereeClock && status === "finished" && actualElapsedMs !== null && (
        <span className="block text-xs font-normal tabular-nums">
          Werkelijke speeltijd: {formatElapsed(actualElapsedMs)}
        </span>
      )}
    </span>
  );
}
