"use client";

import { xpProgressInLevel } from "@/lib/gamification/levels";
import { cardNameLines } from "@/lib/cards/formatCardName";

type CardProfile = {
  xp: number;
  level: number;
  rarity: "common" | "rare" | "epic";
  seasonStats: {
    matches: number;
    minutes: number;
    goals: number;
    assists: number;
    cleanSheets: number;
  };
  badges?: string[];
};

interface PlayerCardGamifiedProps {
  displayName: string;
  number: number | null;
  positionPrimary: string | null;
  photoUrl: string | null;
  cardProfile: CardProfile | null;
  showFullIdentity: boolean;
  /** Coach-only; omit on public/parent/kiosk cards. */
  showMinutes?: boolean;
}

const RARITY_FRAME: Record<string, string> = {
  common: "border-dia-yellow/40 shadow-black/40",
  rare: "border-dia-yellow shadow-[0_0_16px_rgba(255,231,19,0.35)]",
  epic: "border-dia-yellow shadow-[0_0_28px_rgba(255,231,19,0.55)]",
};

export function PlayerCardGamified({
  displayName,
  number,
  positionPrimary,
  photoUrl,
  cardProfile,
  showMinutes = false,
}: PlayerCardGamifiedProps) {
  const rarity = cardProfile?.rarity ?? "common";
  const progress = cardProfile
    ? xpProgressInLevel(cardProfile.xp)
    : { level: 1, intoLevel: 0, needed: 1 };
  const pct = Math.min(100, Math.round((progress.intoLevel / progress.needed) * 100));
  const nameLines = cardNameLines(displayName, "first");

  return (
    <article
      className={`rounded-2xl bg-dia-black border-2 ${RARITY_FRAME[rarity]} overflow-hidden shadow-xl flex flex-col text-white`}
    >
      <div className="relative aspect-[3/4] bg-gradient-to-b from-neutral-800 via-dia-black to-black flex items-center justify-center">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <span className="relative text-5xl font-bold text-dia-yellow/30">
            {number != null ? number : "?"}
          </span>
        )}
        <div className="absolute top-2 left-2 bg-dia-black/80 border border-dia-yellow/50 px-2 py-0.5 rounded text-xs font-bold text-dia-yellow">
          {positionPrimary ?? "—"}
        </div>
        <div className="absolute top-2 right-2 bg-dia-black/80 border border-dia-yellow/50 px-2 py-0.5 rounded font-mono text-sm text-white">
          #{number ?? "—"}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logos/dia.png"
          alt=""
          className="pointer-events-none absolute bottom-10 right-2 h-10 w-10 rounded-full bg-dia-black/70 p-1 object-contain"
        />
        {cardProfile ? (
          <div className="absolute bottom-2 left-2 right-2">
            <div className="flex justify-between text-[10px] uppercase tracking-wide mb-1 text-dia-yellow">
              <span>Lvl {cardProfile.level}</span>
              <span>{cardProfile.xp} XP</span>
            </div>
            <div className="h-1.5 rounded-full bg-black/60 overflow-hidden border border-dia-yellow/20">
              <div
                className="h-full bg-dia-yellow transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        ) : null}
      </div>
      <div className="p-3 space-y-1 border-t border-dia-yellow/20 bg-gradient-to-r from-black to-neutral-900">
        <h3 className="font-bold text-sm leading-tight text-white">
          {nameLines.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </h3>
        {cardProfile ? (
          <p className="text-xs text-dia-yellow/70">
            {showMinutes
              ? `${cardProfile.seasonStats.minutes} min · `
              : ""}
            {cardProfile.seasonStats.goals} doel ·{" "}
            {cardProfile.seasonStats.assists} assist ·{" "}
            {cardProfile.seasonStats.matches} wedstr.
          </p>
        ) : (
          <p className="text-xs text-white/40">Geen gamificatie-toestemming</p>
        )}
        {cardProfile?.badges && cardProfile.badges.length > 0 ? (
          <div className="flex flex-wrap gap-1 pt-1">
            {cardProfile.badges.slice(0, 4).map((b) => (
              <span
                key={b}
                className="text-[10px] px-1.5 py-0.5 rounded bg-dia-yellow/15 text-dia-yellow border border-dia-yellow/30"
              >
                {b.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}
