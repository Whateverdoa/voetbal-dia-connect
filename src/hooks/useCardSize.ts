"use client";

/**
 * Responsive card dimensions for field and bench player cards.
 * Returns smaller sizes on phones (<640px), larger on tablet/desktop.
 * Mobile-first default prevents layout flash on the primary device (pitch-side phone).
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

const PHONE: CardSize = {
  card: 70,
  avatar: 34,
  icon: 22,
  nameFont: 9,
  numFont: 11,
  posFont: 8,
};

const TABLET: CardSize = {
  card: 90,
  avatar: 45,
  icon: 28,
  nameFont: 11,
  numFont: 14,
  posFont: 10,
};

const BREAKPOINT = "(min-width: 640px)";

export function useCardSize(): CardSize {
  const [isWide, setIsWide] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(BREAKPOINT);
    setIsWide(mql.matches);
    const handler = (e: MediaQueryListEvent) => setIsWide(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  return isWide ? TABLET : PHONE;
}
