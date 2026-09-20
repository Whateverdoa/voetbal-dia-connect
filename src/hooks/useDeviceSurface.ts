"use client";

import { useEffect, useState } from "react";
import {
  surfaceFromViewport,
  type DeviceSurface,
} from "@/lib/deviceSurface";

/**
 * Phone-first until measured, then pc for iPad/laptop.
 */
export function useDeviceSurface(): DeviceSurface {
  const [surface, setSurface] = useState<DeviceSurface>("mobile");

  useEffect(() => {
    const update = () => {
      setSurface(surfaceFromViewport(window.innerWidth, window.innerHeight));
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return surface;
}
