"use client";

import { useState, useEffect } from "react";
import type { MatchStatus } from "./types";

interface MatchClockProps {
  currentQuarter: number;
  quarterCount: number;
  quarterStartedAt?: number;
  pausedAt?: number;
  accumulatedPauseTime?: number;
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
 * Real-time match clock showing elapsed time in global match time.
 * Quarter anchors:
 * - Q1 starts at 00:00
 * - Q2 starts at 15:00 (for 4 quarters)
 * - Q3 starts at 30:00
 * - Q4 starts at 45:00
 * For 2 halves, anchors are 00:00 and 30:00.
 *
 * Accounts for pauses via pausedAt + accumulatedPauseTime.
 * - Running:  elapsed = quarterBase + (now - quarterStartedAt - accumulatedPauseTime)
 * - Paused:   elapsed = quarterBase + (pausedAt - quarterStartedAt - accumulatedPauseTime)
 * - Stopped:  displays "--:--"
 */
export function MatchClock({
  currentQuarter,
  quarterCount,
  quarterStartedAt,
  pausedAt,
  accumulatedPauseTime = 0,
  status,
}: MatchClockProps) {
  const isLive = status === "live";
  const isPaused = isLive && pausedAt != null;
  const shouldTick = isLive && quarterStartedAt != null && !isPaused;

  const quarterDurationMs = (60 * 60 * 1000) / Math.max(1, quarterCount);
  const quarterBaseMs = Math.max(0, currentQuarter - 1) * quarterDurationMs;
  const calcElapsed = (refTime: number) => {
    if (quarterStartedAt == null) {
      return 0;
    }
    const quarterElapsed = Math.max(
      0,
      refTime - quarterStartedAt - accumulatedPauseTime
    );
    return quarterBaseMs + quarterElapsed;
  };

  const [elapsed, setElapsed] = useState(() =>
    isPaused && pausedAt != null
      ? calcElapsed(pausedAt)
      : shouldTick
        ? calcElapsed(Date.now())
        : 0
  );

  useEffect(() => {
    // Paused: show frozen time, no interval
    if (isPaused && pausedAt != null) {
      setElapsed(calcElapsed(pausedAt));
      return;
    }

    if (!shouldTick) {
      setElapsed(0);
      return;
    }

    // Running: sync immediately, then tick every second
    setElapsed(calcElapsed(Date.now()));

    const interval = setInterval(() => {
      setElapsed(calcElapsed(Date.now()));
    }, 1000);

    return () => clearInterval(interval);
  }, [
    shouldTick,
    isPaused,
    quarterStartedAt,
    pausedAt,
    accumulatedPauseTime,
    quarterBaseMs,
  ]);

  const isActive = shouldTick || isPaused;
  const display = isActive ? formatElapsed(elapsed) : "--:--";

  return (
    <span
      className={`font-mono tabular-nums ${isPaused ? "text-yellow-300 animate-pulse" : "text-white/80"}`}
      aria-label={
        isPaused
          ? `Klok gepauzeerd: ${display}`
          : isActive
            ? `Speeltijd: ${display}`
            : "Klok gestopt"
      }
    >
      {display}
    </span>
  );
}
