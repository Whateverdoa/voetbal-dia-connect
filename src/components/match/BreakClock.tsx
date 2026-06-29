"use client";

import { useEffect, useRef, useState } from "react";
import { formatElapsed } from "./MatchClock";

type BreakClockProps = {
  scheduledBreakEndAt?: number;
  autoStart?: boolean;
};

export function BreakClock({ scheduledBreakEndAt, autoStart = true }: BreakClockProps) {
  const [now, setNow] = useState(() => Date.now());
  const notifiedRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (scheduledBreakEndAt == null) return null;

  const remainingMs = Math.max(0, scheduledBreakEndAt - now);
  const isDone = remainingMs === 0;

  useEffect(() => {
    if (!isDone) {
      notifiedRef.current = false;
      return;
    }
    if (autoStart || notifiedRef.current) return;

    notifiedRef.current = true;
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([120, 80, 120]);
    }
  }, [autoStart, isDone]);

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-center">
      <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">
        Rustklok
      </p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-orange-950">
        {formatElapsed(remainingMs)}
      </p>
      <p className="mt-1 text-xs text-orange-800">
        {isDone
          ? autoStart
            ? "Hervatten..."
            : "Rust voorbij"
          : autoStart
            ? "Automatisch hervatten na rust"
            : "Handmatig hervatten na rust"}
      </p>
    </div>
  );
}
