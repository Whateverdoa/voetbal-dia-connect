"use client";

import { useEffect, useMemo, useState } from "react";
import { computeActualElapsedMs, computeElapsedMs, formatElapsed } from "./engine";
import type { MatchClockSnapshot } from "./types";

export function useMatchClock(snapshot: MatchClockSnapshot) {
  const shouldTick = snapshot.status === "live" && (snapshot.refereeClock ? snapshot.refereeClock.runningSince !== null : snapshot.quarterStartedAt != null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!shouldTick) return;

    const initialTimer = setTimeout(() => setNow(Date.now()), 0);
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [shouldTick, snapshot.quarterStartedAt, snapshot.refereeClock?.runningSince]);

  const elapsedMs = useMemo(
    () => computeElapsedMs(snapshot, now),
    [snapshot, now]
  );

  return {
    actualElapsedMs: computeActualElapsedMs(snapshot, now),
    elapsedMs,
    display: elapsedMs == null ? "--:--" : formatElapsed(elapsedMs),
    isRunning: shouldTick,
    hasClock: elapsedMs != null,
  };
}
