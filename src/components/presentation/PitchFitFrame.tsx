"use client";

import { useEffect, useRef, useState, type ReactNode, type Ref } from "react";
import { containBox } from "@/lib/pitchFit";

const PITCH_STYLE = {
  background: "#2d7a3a",
  borderColor: "#1e5c28",
} as const;

interface PitchFitFrameProps {
  aspectW: number;
  aspectH: number;
  fill?: boolean;
  pitchRef?: Ref<HTMLDivElement>;
  onWidth?: (width: number) => void;
  children: ReactNode;
}

/** Pitch box: either max-w-4xl, or letterboxed into the parent. */
export function PitchFitFrame({
  aspectW,
  aspectH,
  fill = false,
  pitchRef,
  onWidth,
  children,
}: PitchFitFrameProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onWidthRef = useRef(onWidth);
  onWidthRef.current = onWidth;
  const [box, setBox] = useState({ width: 0, height: 0 });

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
          className="relative w-full max-w-4xl touch-none overflow-hidden border-2 rounded-md shadow-2xl"
          style={{ ...PITCH_STYLE, aspectRatio: `${aspectW} / ${aspectH}` }}
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
        className="relative touch-none overflow-hidden border-2 rounded-md shadow-2xl"
        style={{
          ...PITCH_STYLE,
          aspectRatio: `${aspectW} / ${aspectH}`,
          width: box.width > 0 ? box.width : "min(100%, 56rem)",
          height: box.height > 0 ? box.height : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
