"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { computeElapsedMs } from "./engine";
import type { MatchClockSnapshot } from "./types";
import {
  buildQuarterReminderMessage,
  detectNextQuarterReminder,
  fireQuarterReminderSignal,
  quarterReminderKey,
} from "./quarterEndReminder";

export function useQuarterEndReminder(snapshot: MatchClockSnapshot) {
  const [message, setMessage] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const firedRef = useRef(new Set<string>());

  const shouldTick =
    snapshot.status === "live" && snapshot.quarterStartedAt != null;

  useEffect(() => {
    if (!shouldTick) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [shouldTick, snapshot.quarterStartedAt]);

  useEffect(() => {
    firedRef.current = new Set();
    setMessage(null);
  }, [snapshot.currentQuarter, snapshot.quarterStartedAt]);

  useEffect(() => {
    if (snapshot.status !== "live") {
      firedRef.current = new Set();
      setMessage(null);
    }
  }, [snapshot.status]);

  const elapsedMs = useMemo(
    () => (shouldTick ? computeElapsedMs(snapshot, now) : null),
    [shouldTick, snapshot, now]
  );

  useEffect(() => {
    if (!shouldTick || elapsedMs == null) return;

    const kind = detectNextQuarterReminder(elapsedMs, snapshot, firedRef.current);
    if (kind == null) return;

    const key = quarterReminderKey(snapshot.currentQuarter, kind);
    firedRef.current.add(key);
    fireQuarterReminderSignal(kind);
    setMessage(
      buildQuarterReminderMessage(
        kind,
        snapshot.currentQuarter,
        snapshot.quarterCount
      )
    );
  }, [shouldTick, elapsedMs, snapshot]);

  const dismiss = () => setMessage(null);

  return { message, dismiss };
}
