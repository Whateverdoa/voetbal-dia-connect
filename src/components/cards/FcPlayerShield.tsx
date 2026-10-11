"use client";

import { useState } from "react";
import { FC_ATTRIBUTES, PLAY_STYLES, withCardBonus, type FcCardData } from "@/lib/cards/fc27";
import { useCardTime } from "@/hooks/useCardTime";
import type { DisciplineBadge } from "@/lib/cards/cardRules";
import { ShieldCard } from "./ShieldCard";
import { FootballShieldContent } from "./FootballShieldContent";
import { toFootballShieldStats } from "@/lib/cards/footballRatings";
import { PlayerShirt } from "./PlayerShirt";

export interface FcPlayerShieldProps extends FcCardData {
  name: string;
  number?: number | null;
  position?: string | null;
  /** Server-filtered URL: public/team views pass null when photo consent is absent. */
  photoUrl?: string | null;
  compact?: boolean;
  width?: number;
  seasonMinutes?: number;
  disciplineBadge?: DisciplineBadge;
  className?: string;
}

const AWARD_NAME = { week: "Team van de week", month: "Team van de maand" } as const;

/** Shared card face; the week award uses the existing DIA team-portal artwork. */
export function FcPlayerShield({
  name, number, position, photoUrl, fcRatings, playStyleIds = [], recognitions = [],
  compact = false, width, seasonMinutes, disciplineBadge, className = "",
}: FcPlayerShieldProps) {
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const portrait = photoUrl && photoUrl !== failedPhoto ? photoUrl : null;
  const now = useCardTime(recognitions);
  const card = withCardBonus(fcRatings, recognitions, now);
  const isWeek = card.kind === "week";
  const accent = card.kind === "month" ? "#ddd0ff" : isWeek ? "#dfc16b" : "#68e9c5";
  const theme = card.kind === "month" ? "crystal" : "dia";
  const stats = toFootballShieldStats(card.ratings);
  const shortName = name.trim() || "Speler";
  const styles = PLAY_STYLES.filter((style) => playStyleIds.includes(style.id)).slice(0, 3);
  const label = [shortName, position, card.overall === null ? "Nog niet beoordeeld" : `Algemeen ${card.overall}`,
    card.kind ? AWARD_NAME[card.kind] : null,
    !compact && styles.length ? `Speelstijlen: ${styles.map((style) => style.name).join(", ")}` : null,
    !compact ? FC_ATTRIBUTES.map(({ key, name: attributeName }) => `${attributeName} ${card.ratings?.[key] ?? "nog niet beoordeeld"}`).join(", ") : null,
    disciplineBadge ? (disciplineBadge === "red" ? "Rode kaart" : "Gele kaart") : null].filter(Boolean).join(" · ");
  const compactFonts = width && width >= 120
    ? { name: 14, number: 20, position: 12, overall: 20 }
    : width && width >= 70
      ? { name: 11, number: 14, position: 10, overall: 16 }
      : { name: 9, number: 11, position: 8, overall: 11 };

  return (
    <div className={`relative isolate text-white ${className}`} style={{ width: width ?? "100%" }} role="img" aria-label={label} data-card-kind={card.kind ?? "base"}>
      <div className="relative">
        <ShieldCard theme={isWeek ? "gold" : theme} series={card.kind === "month" ? "premium" : "abstract"} contentLayout="football"
          backgroundSrc={isWeek ? "/team-portal/dia-gold-shield-empty-v2-960.webp" : undefined}>
          {!compact ? <>
            <FootballShieldContent name={shortName} position={position ?? undefined} stats={stats} playStyleIds={playStyleIds}
              media={portrait ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={portrait} src={portrait} alt="" data-player-portrait onError={() => setFailedPhoto(portrait)}
                  className="h-full w-full rounded-[10%] object-contain object-bottom" />
              ) : <PlayerShirt number={number} />} />
            {disciplineBadge ? <span className="absolute right-0 top-[5%] rounded-[2px] shadow-sm ring-1 ring-black/30" title={disciplineBadge === "red" ? "Rode kaart" : "Gele kaart"} style={{ width: 9, height: 13, background: disciplineBadge === "red" ? "#dc2626" : "#facc15" }} /> : null}
          </> : null}
        </ShieldCard>
        {compact ? <div className="pointer-events-none absolute left-[24%] top-[23%] h-[32%] w-[57%]" aria-hidden="true">
          {portrait ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={portrait} src={portrait} alt="" data-player-portrait onError={() => setFailedPhoto(portrait)} className="h-full w-full rounded-[10%] object-contain" />
          ) : <PlayerShirt />}
        </div> : null}
      {compact ? (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <span className="absolute left-[11%] top-[17%] font-black leading-none tabular-nums" style={{ fontSize: compactFonts.overall }}>{card.overall ?? "—"}</span>
          <span className="absolute left-[11%] top-[35%] font-bold leading-none" style={{ fontSize: compactFonts.position }}>{position ?? "—"}</span>
          {number != null ? <span className="absolute right-[11%] top-[16%] rounded-sm px-0.5 font-mono font-bold leading-none tabular-nums" style={{ fontSize: compactFonts.number, background: isWeek ? "#171713cc" : "#1c102ccc" }}>{number}</span> : null}
          {disciplineBadge ? <span className="absolute right-[11%] top-[36%] rounded-[2px] shadow-sm ring-1 ring-black/30" title={disciplineBadge === "red" ? "Rode kaart" : "Gele kaart"} style={{ width: 9, height: 13, background: disciplineBadge === "red" ? "#dc2626" : "#facc15" }} /> : null}
          <span className="absolute inset-x-[4%] top-[62%] truncate rounded-sm px-0.5 py-0.5 text-center font-extrabold leading-tight" title={shortName} style={{ fontSize: compactFonts.name, background: isWeek ? "#171713f2" : "#101720f2" }}>{shortName}</span>
          {card.kind ? <span className="absolute inset-x-0 top-[88%] text-center font-bold leading-none" style={{ fontSize: Math.max(8, compactFonts.name - 2), color: accent }}>{card.kind === "month" ? "MAAND" : "WEEK"} +{card.bonus}</span> : null}
        </div>
      ) : null}
      </div>
      {!compact && card.kind ? <div className="mx-auto mt-1 w-fit max-w-full rounded-xl bg-[#101720] px-3 py-2 text-center text-[10px] font-extrabold" style={{ color: accent }}>
        {AWARD_NAME[card.kind].toUpperCase()} +{card.bonus}
      </div> : null}
      {seasonMinutes !== undefined ? <span className="block text-center text-[10px] font-semibold tabular-nums text-white/90">{seasonMinutes}′</span> : null}
      {!compact ? <span className="sr-only">{FC_ATTRIBUTES.map(({ key, name: attributeName }) => `${attributeName} ${card.ratings?.[key] ?? "nog niet beoordeeld"}`).join(", ")}</span> : null}
    </div>
  );
}
