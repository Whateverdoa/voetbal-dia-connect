"use client";

import { xpProgressInLevel } from "@/lib/gamification/levels";
import { cardNameLines } from "@/lib/cards/formatCardName";
import type { CardProfile, FcCardData } from "@/lib/cards/fc27";
import { FcPlayerShield } from "./FcPlayerShield";

interface PlayerCardGamifiedProps extends FcCardData {
  displayName: string;
  number: number | null;
  positionPrimary: string | null;
  photoUrl: string | null;
  cardProfile: CardProfile | null;
  showFullIdentity: boolean;
  /** Coach-only; the server also removes minutes from public payloads. */
  showMinutes?: boolean;
}

export function PlayerCardGamified({
  displayName, number, positionPrimary, photoUrl, cardProfile, showFullIdentity,
  fcRatings, playStyleIds, recognitions, showMinutes = false,
}: PlayerCardGamifiedProps) {
  const progress = cardProfile ? xpProgressInLevel(cardProfile.xp) : null;
  const pct = progress ? Math.min(100, Math.round((progress.intoLevel / progress.needed) * 100)) : 0;
  const name = cardNameLines(displayName, showFullIdentity ? "full" : "first").join(" ");
  const minutes = cardProfile?.seasonStats.minutes;

  return (
    <article className="flex h-full flex-col rounded-2xl border border-white/10 bg-dia-black p-1 text-white">
      <FcPlayerShield name={name} number={number} position={positionPrimary} photoUrl={photoUrl}
        fcRatings={fcRatings} playStyleIds={playStyleIds} recognitions={recognitions} />
      <div className="space-y-1.5 px-2 pb-2">
        {cardProfile ? <>
          <div className="flex justify-between text-[10px] text-dia-yellow"><span>Level {cardProfile.level}</span><span>{cardProfile.xp} XP</span></div>
          <div className="h-1 rounded-full bg-white/10"><div className="h-full rounded-full bg-dia-yellow" style={{ width: `${pct}%` }} /></div>
          <p className="text-[11px] leading-relaxed text-white/60">
            {showMinutes && minutes !== undefined ? `${minutes} min · ` : ""}
            {cardProfile.seasonStats.goals} doel · {cardProfile.seasonStats.assists} assist · {cardProfile.seasonStats.matches} wedstr.
          </p>
        </> : <p className="text-[11px] text-white/50">Geen seizoensgegevens beschikbaar</p>}
      </div>
    </article>
  );
}
