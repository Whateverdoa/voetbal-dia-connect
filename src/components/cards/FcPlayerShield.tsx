"use client";

import { useId } from "react";
import { FC_ATTRIBUTES, PLAY_STYLES, withCardBonus, type FcCardData } from "@/lib/cards/fc27";
import { useCardTime } from "@/hooks/useCardTime";
import type { DisciplineBadge } from "@/lib/cards/cardRules";
import { PlayStyleIcon } from "./PlayStyleIcon";

export interface FcPlayerShieldProps extends FcCardData {
  name: string;
  number?: number | null;
  position?: string | null;
  photoUrl?: string | null;
  compact?: boolean;
  width?: number;
  seasonMinutes?: number;
  disciplineBadge?: DisciplineBadge;
  className?: string;
}

const OUTLINE = "M13 49 85 19Q104 31 120 9Q136 31 155 19L227 49 224 258Q185 264 120 294Q55 264 16 258Z";
const AWARD_NAME = { week: "Team van de week", month: "Team van de maand" } as const;

/** Shared card face; the week award uses the existing DIA team-portal artwork. */
export function FcPlayerShield({
  name, number, position, photoUrl, fcRatings, playStyleIds = [], recognitions = [],
  compact = false, width, seasonMinutes, disciplineBadge, className = "",
}: FcPlayerShieldProps) {
  const id = useId().replace(/:/g, "");
  const now = useCardTime(recognitions);
  const card = withCardBonus(fcRatings, recognitions, now);
  const isWeek = card.kind === "week";
  const accent = card.kind === "month" ? "#FFE713" : isWeek ? "#dfc16b" : "#68e9c5";
  const base = card.kind === "month" ? "#6b4814" : "#3d1764";
  const shortName = name.trim() || "Speler";
  const label = [shortName, position, card.overall === null ? "Nog niet beoordeeld" : `Algemeen ${card.overall}`,
    card.kind ? AWARD_NAME[card.kind] : null,
    !compact ? FC_ATTRIBUTES.map(({ key, name: attributeName }) => `${attributeName} ${card.ratings?.[key] ?? "nog niet beoordeeld"}`).join(", ") : null,
    disciplineBadge ? (disciplineBadge === "red" ? "Rode kaart" : "Gele kaart") : null].filter(Boolean).join(" · ");
  const styles = PLAY_STYLES.filter((style) => playStyleIds.includes(style.id)).slice(0, 3);
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
          {/* Reuse the original artwork unchanged, including its transparent edge. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/team-portal/dia-gold-shield-v1-480.webp"
            srcSet="/team-portal/dia-gold-shield-v1-480.webp 480w, /team-portal/dia-gold-shield-v1-960.webp 960w"
            sizes={width ? `${width}px` : "(max-width: 639px) 45vw, 240px"}
            alt="" width={1070} height={1470} decoding="async"
            className="absolute inset-0 h-full w-full drop-shadow-[0_5px_6px_rgba(0,0,0,0.4)]" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logos/dia.png" alt="" width={80} height={88}
            className={`absolute h-auto object-contain drop-shadow-md ${compact ? "left-[11%] top-[50%] w-[16%]" : "right-[9%] top-[16%] w-[20%]"}`} />
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" className="absolute left-[23%] top-[30%] h-[33%] w-[54%] rounded-[12%] object-cover object-top" />
          ) : !compact && number != null ? (
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
            {styles.length ? <div className="absolute inset-x-0 top-[88%] flex justify-center gap-1 text-[#dfc16b]">
              {styles.map((style) => <PlayStyleIcon key={style.id} styleId={style.id} decorative size={14} />)}
            </div> : null}
          </> : null}
        </div>
      ) : (
      <svg viewBox="0 0 240 310" className="block w-full overflow-visible drop-shadow-[0_5px_6px_rgba(0,0,0,0.4)]" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={base} /><stop offset=".55" stopColor="#362065" /><stop offset="1" stopColor="#110e26" /></linearGradient>
          <linearGradient id={`${id}-gold`}><stop stopColor="#a16d2b" /><stop offset=".5" stopColor="#fff0ae" /><stop offset="1" stopColor="#a16d2b" /></linearGradient>
          <linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1"><stop offset=".65" stopColor="white" /><stop offset="1" stopColor="black" /></linearGradient>
          <mask id={`${id}-portrait`}><rect x="38" y="38" width="187" height="173" fill={`url(#${id}-fade)`} /></mask>
          <clipPath id={`${id}-clip`}><path d={OUTLINE} /></clipPath>
        </defs>
        <path d={OUTLINE} fill={`url(#${id}-bg)`} stroke={`url(#${id}-gold)`} strokeWidth="9" />
        <g clipPath={`url(#${id}-clip)`}>
          <path d="M34 190 193 29 217 214 73 87 214 92 32 252 193 29 47 116 211 177Z" fill="none" stroke="#dcafff" strokeWidth="2" opacity=".42" />
          <path d="m36 190 157-161-45 160ZM73 87l144 127-6-37ZM193 29l18 148-63 12Z" fill="#d1c0fa" opacity=".13" />
          <path d="M25 218 222 87M44 70l159 185M26 244l177-44" stroke={accent} strokeWidth="1" opacity=".27" />
          <g fill="#dbd4ef" opacity=".64"><circle cx="134" cy="105" r="31" /><path d="M72 199v-20c0-29 27-43 62-43s62 14 62 43v20z" /></g>
          {photoUrl ? (
            <image href={photoUrl} x="42" y="41" width="184" height="172" preserveAspectRatio="xMidYMid slice" mask={`url(#${id}-portrait)`} />
          ) : null}
          <path d="M15 195Q120 178 225 195V267L120 292 15 267Z" fill="#1c102c" opacity=".86" />
        </g>
        <path d={OUTLINE} fill="none" stroke={accent} strokeWidth="3" />
        <path d="M8 77 9 244M232 77l-1 167" stroke={`url(#${id}-gold)`} strokeWidth="2" />
        <image href="/logos/dia.png" x="28" y={compact ? "155" : "113"} width={compact ? "40" : "28"} height={compact ? "40" : "28"} preserveAspectRatio="xMidYMid meet" />
        {!compact ? (
          <>
            <text x="28" y="83" fill="white" fontSize="38" fontWeight="900" fontFamily="Arial, sans-serif">{card.overall ?? "—"}</text>
            <text x="29" y="103" fill="#eee5ff" fontSize="15" fontWeight="800">{position ?? "—"}</text>
            {number != null ? <text x="210" y="65" fill="#eee5ff" textAnchor="end" fontSize="12" fontWeight="700">#{number}</text> : null}
            {disciplineBadge ? <rect x="202" y="75" width="9" height="14" rx="1" fill={disciplineBadge === "red" ? "#ef4444" : "#facc15"} /> : null}
            <text x="120" y="214" textAnchor="middle" fill="white" fontSize={shortName.length > 17 ? "15" : "20"} fontWeight="800" textLength={shortName.length > 21 ? "184" : undefined} lengthAdjust="spacingAndGlyphs">{shortName}</text>
            {FC_ATTRIBUTES.map((attribute, index) => {
              const x = 38 + index * 33;
              return <g key={attribute.key}>
                <PlayStyleIcon styleId={attribute.icon} decorative x={x - 7} y="220" width="14" height="14" style={{ color: accent }} />
                <text x={x} y="246" textAnchor="middle" fill="#d9d1ea" fontSize="10" fontWeight="700">{attribute.label}</text>
                <text x={x} y="260" textAnchor="middle" fill="white" fontSize="16" fontWeight="800">{card.ratings?.[attribute.key] ?? "—"}</text>
              </g>;
            })}
            {styles.map((style, index) => <PlayStyleIcon key={style.id} styleId={style.id} decorative x={113 + index * 16 - ((styles.length - 1) * 8)} y="270" width="14" height="14" style={{ color: accent }} />)}
          </>
        ) : null}
        {card.kind && !compact ? <text x="120" y="304" textAnchor="middle" fill={accent} fontSize="10" fontWeight="800">{AWARD_NAME[card.kind].toUpperCase()}</text> : null}
      </svg>
      )}
      {compact ? (
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <span className="absolute left-[11%] top-[17%] font-black leading-none tabular-nums" style={{ fontSize: compactFonts.overall }}>{card.overall ?? "—"}</span>
          <span className="absolute left-[11%] top-[35%] font-bold leading-none" style={{ fontSize: compactFonts.position }}>{position ?? "—"}</span>
          {number != null ? <span className="absolute right-[11%] top-[16%] rounded-sm px-0.5 font-mono font-bold leading-none tabular-nums" style={{ fontSize: compactFonts.number, background: isWeek ? "#171713cc" : "#1c102ccc" }}>{number}</span> : null}
          {disciplineBadge ? <span className="absolute right-[11%] top-[36%] rounded-[2px] shadow-sm ring-1 ring-black/30" title={disciplineBadge === "red" ? "Rode kaart" : "Gele kaart"} style={{ width: 9, height: 13, background: disciplineBadge === "red" ? "#dc2626" : "#facc15" }} /> : null}
          <span className="absolute inset-x-[4%] top-[66%] truncate rounded-sm px-0.5 py-0.5 text-center font-extrabold leading-tight" title={shortName} style={{ fontSize: compactFonts.name, background: isWeek ? "#171713f2" : "#1c102cf2" }}>{shortName}</span>
          {card.kind ? <span className="absolute inset-x-0 top-[85%] text-center font-bold leading-none" style={{ fontSize: Math.max(8, compactFonts.name - 2), color: accent }}>{card.kind === "month" ? "MAAND" : "WEEK"} +{card.bonus}</span> : null}
        </div>
      ) : null}
      </div>
      {isWeek && !compact ? <span className="block text-center text-[10px] font-extrabold text-[#dfc16b]">TEAM VAN DE WEEK +{card.bonus}</span> : null}
      {seasonMinutes !== undefined ? <span className="block text-center text-[10px] font-semibold tabular-nums text-white/90">{seasonMinutes}′</span> : null}
      {!compact ? <span className="sr-only">{FC_ATTRIBUTES.map(({ key, name: attributeName }) => `${attributeName} ${card.ratings?.[key] ?? "nog niet beoordeeld"}`).join(", ")}</span> : null}
    </div>
  );
}
