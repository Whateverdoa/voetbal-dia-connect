"use client";

import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { containBox } from "@/lib/pitchFit";

const PITCH_STYLE = {
  background: "#2d7a3a",
  borderColor: "#1e5c28",
} as const;

/** Half-pitch 3D sits on dark chrome; flat grass here would show as a letterbox halo. */
const HALF_PITCH_FRAME_STYLE = {
  background: "transparent",
  borderColor: "transparent",
} as const;

interface PitchFitFrameProps {
  aspectW: number;
  aspectH: number;
  fill?: boolean;
  /** Allow children to paint outside the box (e.g. 3D-lifted half-pitch cards). */
  allowOverflow?: boolean;
  pitchRef?: Ref<HTMLDivElement>;
  onWidth?: (width: number) => void;
  children: ReactNode;
}

/** Pitch box: either max-w-4xl, or letterboxed into the parent. */
export function PitchFitFrame({
  aspectW,
  aspectH,
  fill = false,
  allowOverflow = false,
  pitchRef,
  onWidth,
  children,
}: PitchFitFrameProps) {
  const overflowClass = allowOverflow ? "overflow-visible" : "overflow-hidden";
  const frameStyle = allowOverflow ? HALF_PITCH_FRAME_STYLE : PITCH_STYLE;
  const borderClass = allowOverflow ? "border-0" : "border-2";
  const hostRef = useRef<HTMLDivElement>(null);
  const onWidthRef = useRef(onWidth);
  const [box, setBox] = useState({ width: 0, height: 0 });

  useEffect(() => {
    onWidthRef.current = onWidth;
  }, [onWidth]);

  useEffect(() => {
    if (!fill) return;
    const el = hostRef.current;
    if (!el) return;
    const update = () => {
      const next = containBox(el.clientWidth, el.clientHeight, aspectW, aspectH);
      setBox(next);
      onWidthRef.current?.(next.width);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [fill, aspectW, aspectH]);

  if (!fill) {
    return (
      <div className="w-full flex justify-center">
        <div
          ref={pitchRef}
          className={`relative w-full max-w-4xl touch-none ${overflowClass} ${borderClass} rounded-md shadow-2xl`}
          style={{ ...frameStyle, aspectRatio: `${aspectW} / ${aspectH}` }}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={hostRef}
      className="w-full h-full min-h-0 grid place-items-center"
    >
      <div
        ref={pitchRef}
        className={`relative touch-none ${overflowClass} ${borderClass} rounded-md shadow-2xl`}
        style={{
          ...frameStyle,
          aspectRatio: `${aspectW} / ${aspectH}`,
          width: box.width > 0 ? box.width : "min(100%, 56rem)",
          height: box.height > 0 ? box.height : undefined,
          maxHeight: "100%",
        }}
      >
        {children}
      </div>
    </div>
  );
}
