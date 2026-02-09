"use client";

import { useState, useEffect } from "react";
import type { MatchStatus } from "./types";

interface MatchClockProps {
  quarterStartedAt?: number;
  status: MatchStatus;
}

/**
 * Formats elapsed milliseconds as MM:SS.
 * Exported for testing.
 */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Real-time match clock showing elapsed time in the current quarter.
 * Only ticks when the match is live and quarterStartedAt is set.
 * Displays "--:--" when not live (rest, finished, etc.).
 */
export function MatchClock({ quarterStartedAt, status }: MatchClockProps) {
  const isLive = status === "live";
  const shouldTick = isLive && quarterStartedAt != null;

  const [elapsed, setElapsed] = useState(() =>
    shouldTick ? Date.now() - quarterStartedAt : 0
  );

  useEffect(() => {
    if (!shouldTick) {
      setElapsed(0);
      return;
    }

    // Sync immediately
    setElapsed(Date.now() - quarterStartedAt);

    const interval = setInterval(() => {
      setElapsed(Date.now() - quarterStartedAt);
    }, 1000);

    return () => clearInterval(interval);
  }, [shouldTick, quarterStartedAt]);

  const display = shouldTick ? formatElapsed(elapsed) : "--:--";

  return (
    <span
      className="font-mono tabular-nums text-white/80"
      aria-label={shouldTick ? `Speeltijd: ${display}` : "Klok gestopt"}
    >
      {display}
    </span>
  );
}
