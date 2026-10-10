"use client";

/**
 * Responsive card dimensions for field and bench player cards.
 * Phone / tablet / presentation (TV) breakpoints.
 *
 * Phone vs tablet uses the *short* viewport side so landscape phones
 * stay on compact cards (width alone hits 640px+ and used to jump to TABLET).
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

/** Compact phone cards to reduce pitch overlap; fonts stay readable. */
export const PHONE: CardSize = {
  card: 48,
  avatar: 24,
  icon: 14,
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

/** Compact when the shorter side is phone-sized (covers portrait + landscape). */
const COMPACT_MAX_SHORT_SIDE = 520;

export type CardSizeMode = "auto" | "presentation";

function isCompactViewport(): boolean {
  if (typeof window === "undefined") return true;
  return Math.min(window.innerWidth, window.innerHeight) < COMPACT_MAX_SHORT_SIDE;
}

export function useCardSize(mode: CardSizeMode = "auto"): CardSize {
  const [compact, setCompact] = useState(true);

  useEffect(() => {
    if (mode === "presentation") return;

    const update = () => setCompact(isCompactViewport());
    update();

    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, [mode]);

  if (mode === "presentation") return PRESENTATION;
  return compact ? PHONE : TABLET;
}
