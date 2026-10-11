"use client";

import { useState } from "react";
import { FC_ATTRIBUTES, PLAY_STYLES, withCardBonus, type FcCardData } from "@/lib/cards/fc27";
import { useCardTime } from "@/hooks/useCardTime";
import type { DisciplineBadge } from "@/lib/cards/cardRules";
import { PlayStyleIcon } from "./PlayStyleIcon";
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
      <div className={`relative ${isWeek ? "aspect-[107/147] [container-type:inline-size]" : ""}`}>
      {isWeek ? (
        <div className="absolute inset-0 text-[#fff3d6]" aria-hidden="true">
          {/* Never place a portrait over artwork with a baked-in shirt. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={portrait ? "/team-portal/dia-gold-shield-empty-v2-480.webp" : "/team-portal/dia-gold-shield-v1-480.webp"}
            srcSet={portrait ? "/team-portal/dia-gold-shield-empty-v2-480.webp 480w, /team-portal/dia-gold-shield-empty-v2-960.webp 960w" : "/team-portal/dia-gold-shield-v1-480.webp 480w, /team-portal/dia-gold-shield-v1-960.webp 960w"}
            sizes={width ? `${width}px` : "(max-width: 639px) 45vw, 240px"}
            alt="" width={1070} height={1470} decoding="async"
            className="absolute inset-0 h-full w-full drop-shadow-[0_5px_6px_rgba(0,0,0,0.4)]" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/dia.png" alt="" width={80} height={88}
            className={`absolute z-10 h-auto object-contain drop-shadow-md ${compact ? "left-[11%] top-[50%] w-[16%]" : "right-[9%] top-[16%] w-[20%]"}`} />
          {!portrait && !compact && number != null ? (
            <span className="absolute inset-x-0 top-[35%] text-center text-[26cqw] font-black leading-none tracking-tighter text-[#171713] [text-shadow:0_1px_1px_#fff7a5]">{number}</span>
          ) : null}
          {!compact ? <>
            <div className="absolute left-[10%] top-[17%] font-black leading-none">
              <span className="block text-[13cqw] tabular-nums">{card.overall ?? "—"}</span>
              <span className="mt-[1cqw] block text-[4.5cqw] font-bold">{position ?? "—"}</span>
              {number != null ? <span className="mt-[3cqw] block text-[4cqw] font-bold">#{number}</span> : null}
            </div>
            {disciplineBadge ? <span className="absolute right-[10%] top-[36%] rounded-[2px] shadow-sm ring-1 ring-black/30" title={disciplineBadge === "red" ? "Rode kaart" : "Gele kaart"} style={{ width: 9, height: 13, background: disciplineBadge === "red" ? "#dc2626" : "#facc15" }} /> : null}
            <span className="absolute inset-x-[9%] top-[64.5%] flex h-[9%] items-center justify-center truncate text-center font-black uppercase leading-none tracking-[-0.035em] [text-shadow:0_2px_5px_#000]" title={shortName}
              style={{ fontSize: `${Math.min(12, 110 / Math.max(shortName.length, 1))}cqw` }}>{shortName}</span>
            <div className="absolute inset-x-[14%] top-[74%] grid h-[13%] grid-cols-6 gap-0.5 rounded bg-black/70 text-center leading-none">
              {FC_ATTRIBUTES.map((attribute) => <div key={attribute.key} className="flex min-w-0 flex-col items-center justify-between">
                <PlayStyleIcon styleId={attribute.icon} decorative style={{ width: "3.8cqw", height: "3.8cqw", color: accent }} />
                <span className="block text-[max(8px,3.8cqw)] font-bold text-[#dfc16b]">{attribute.label}</span>
                <span className="block text-[max(10px,5.5cqw)] font-extrabold tabular-nums">{card.ratings?.[attribute.key] ?? "—"}</span>
              </div>)}
            </div>
          </> : null}
        </div>
      ) : (
      <ShieldCard theme={theme} series={card.kind === "month" ? "premium" : "abstract"} contentLayout="football">
        {!compact ? <>
          <FootballShieldContent name={shortName} position={position ?? undefined} stats={stats} />
          {disciplineBadge ? <span className="absolute right-0 top-[5%] rounded-[2px] shadow-sm ring-1 ring-black/30" title={disciplineBadge === "red" ? "Rode kaart" : "Gele kaart"} style={{ width: 9, height: 13, background: disciplineBadge === "red" ? "#dc2626" : "#facc15" }} /> : null}
        </> : null}
      </ShieldCard>
      )}
      {portrait ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={portrait} src={portrait} alt="" data-player-portrait
          onError={() => setFailedPhoto(portrait)}
          className={`pointer-events-none absolute top-[23%] rounded-[10%] bg-[#13171c] object-cover object-top ${isWeek ? "left-[27%] h-[38%] w-[53%]" : "left-[34%] w-[48%]"} ${!isWeek ? (compact ? "h-[38%]" : "h-[32%]") : ""}`} />
      ) : !isWeek ? (
        <div className="pointer-events-none absolute left-[24%] top-[23%] h-[32%] w-[57%]" aria-hidden="true"><PlayerShirt number={compact ? undefined : number} /></div>
      ) : null}
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
      {card.kind && !compact ? <span className="block text-center text-[10px] font-extrabold" style={{ color: accent }}>{AWARD_NAME[card.kind].toUpperCase()} +{card.bonus}</span> : null}
      {!compact && styles.length > 0 ? <div className="mt-1 flex justify-center gap-2" aria-hidden="true" style={{ color: accent }}>
        {styles.map((style) => <span key={style.id} title={`${style.name}: ${style.description}`}><PlayStyleIcon styleId={style.id} decorative size={24} /></span>)}
      </div> : null}
      {seasonMinutes !== undefined ? <span className="block text-center text-[10px] font-semibold tabular-nums text-white/90">{seasonMinutes}′</span> : null}
      {!compact ? <span className="sr-only">{FC_ATTRIBUTES.map(({ key, name: attributeName }) => `${attributeName} ${card.ratings?.[key] ?? "nog niet beoordeeld"}`).join(", ")}</span> : null}
    </div>
  );
}
