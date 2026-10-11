"use client";

import { useEffect, useState } from "react";
import type { CardRecognition } from "@/lib/cards/fc27";

/** Refresh an open card at its next award boundary, including after tab sleep. */
export function useCardTime(recognitions: readonly CardRecognition[] = []): number {
  const [now, setNow] = useState(() => Date.now());
  const boundaries = recognitions
    .flatMap((award) => [award.publishedAt, award.expiresAt])
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
    .join(",");

  useEffect(() => {
    if (!boundaries) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const dates = boundaries.split(",").map(Number);
    const refresh = () => {
      const current = Date.now();
      setNow(current);
      if (timer) clearTimeout(timer);
      const next = dates.find((date) => date > current);
      if (next !== undefined) {
        timer = setTimeout(refresh, Math.min(next - current + 1, 2_147_483_647));
      }
    };
    refresh();
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [boundaries]);

  return now;
}
