import Image from "next/image";
import type { ReactNode } from "react";
import { shieldAsset, SHIELD_THEMES, type ShieldTheme, type ShieldSeries } from "@/lib/cards/shieldThemes";

interface ShieldCardProps {
  theme: ShieldTheme;
  series?: ShieldSeries;
  /** Football layout reserves a centered crest below the six stats. */
  contentLayout?: "safe" | "football";
  /** Omit children for a completely blank frame. No player image is embedded. */
  children?: ReactNode;
  className?: string;
  label?: string;
  /** Existing empty artwork; content always follows the shared layout. */
  backgroundSrc?: string;
}

/** Decorative frame with an independent, scalable content layer. */
export function ShieldCard({ theme, series = "premium", contentLayout = "safe", children, className = "", label, backgroundSrc }: ShieldCardProps) {
  const definition = SHIELD_THEMES.find((item) => item.id === theme)!;

  return (
    <div
      className={`relative isolate aspect-[3/4] w-full [container-type:inline-size] ${className}`}
      style={{ color: definition.accent }}
      role={label ? (children ? "group" : "img") : undefined}
      aria-label={label}
    >
      <Image
        src={backgroundSrc ?? shieldAsset(theme, "webp", series)}
        alt=""
        fill
        sizes="(max-width: 640px) 80vw, (max-width: 1024px) 45vw, 360px"
        className="pointer-events-none select-none object-contain"
        draggable={false}
        unoptimized
      />
      {children ? <div className={`absolute inset-x-[14%] top-[15%] ${contentLayout === "football" ? "bottom-[15%]" : "bottom-[22%]"}`}>{children}</div> : null}
    </div>
  );
}
