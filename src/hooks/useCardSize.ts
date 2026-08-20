"use client";

/**
 * Responsive card dimensions for field and bench player cards.
 * Phone / tablet / presentation (TV) breakpoints.
 */

import { useState, useEffect } from "react";

export interface CardSize {
  card: number;
  avatar: number;
  icon: number;
  nameFont: number;
  numFont: number;
  posFont: number;
}

export const PHONE: CardSize = {
  card: 70,
  avatar: 34,
  icon: 22,
  nameFont: 9,
  numFont: 11,
  posFont: 8,
};

export const TABLET: CardSize = {
  card: 90,
  avatar: 45,
  icon: 28,
  nameFont: 11,
  numFont: 14,
  posFont: 10,
};

/** TV / beamer presentation (~140px cards). */
export const PRESENTATION: CardSize = {
  card: 140,
  avatar: 72,
  icon: 40,
  nameFont: 14,
  numFont: 20,
  posFont: 12,
};

const BREAKPOINT = "(min-width: 640px)";

export type CardSizeMode = "auto" | "presentation";

export function useCardSize(mode: CardSizeMode = "auto"): CardSize {
  const [isWide, setIsWide] = useState(false);

  useEffect(() => {
    if (mode === "presentation") return;
    const mql = window.matchMedia(BREAKPOINT);
    setIsWide(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsWide(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [mode]);

  if (mode === "presentation") return PRESENTATION;
  return isWide ? TABLET : PHONE;
}
