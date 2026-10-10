import type { DisciplineBadge } from "@/lib/cards/cardRules";

interface DisciplineCardMarkProps {
  badge: DisciplineBadge;
  /** Slightly larger on field cards vs list rows. */
  size?: "sm" | "md";
  className?: string;
}

/** Small yellow/red card rectangle for player shields. */
export function DisciplineCardMark({
  badge,
  size = "md",
  className = "",
}: DisciplineCardMarkProps) {
  const dims = size === "sm" ? { w: 7, h: 10 } : { w: 9, h: 13 };
  return (
    <span
      className={`inline-block rounded-[2px] shadow-sm ring-1 ring-black/20 ${className}`}
      style={{
        width: dims.w,
        height: dims.h,
        background: badge === "yellow" ? "#facc15" : "#dc2626",
      }}
      title={badge === "yellow" ? "Gele kaart" : "Rode kaart"}
      aria-label={badge === "yellow" ? "Gele kaart" : "Rode kaart"}
    />
  );
}
