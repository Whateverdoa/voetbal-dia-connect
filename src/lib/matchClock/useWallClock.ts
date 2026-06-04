"use client";

import { useEffect, useState } from "react";
import { formatWallTime } from "./engine";

export function useWallClock(options: { seconds?: boolean } = {}) {
  const [date, setDate] = useState<Date | null>(null);

  useEffect(() => {
    const initialTimer = setTimeout(() => setDate(new Date()), 0);
    const interval = setInterval(() => setDate(new Date()), 1000);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, []);

  return date ? formatWallTime(date, options) : "--:--";
}
