"use client";

import { useEffect, type RefObject } from "react";

/** CSS variable that fullscreen shells subtract from the viewport height. */
export const APP_NAV_HEIGHT_VAR = "--app-nav-height";

/**
 * Publish the global nav's height as a CSS variable.
 * The nav is sticky, so it still takes layout space above `h-dvh` shells;
 * without this they overflow the viewport by exactly the nav's height.
 */
export function useAppNavHeight(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const root = document.documentElement;
    const update = () => {
      root.style.setProperty(APP_NAV_HEIGHT_VAR, `${el.offsetHeight}px`);
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      observer.disconnect();
      root.style.removeProperty(APP_NAV_HEIGHT_VAR);
    };
  }, [ref]);
}
