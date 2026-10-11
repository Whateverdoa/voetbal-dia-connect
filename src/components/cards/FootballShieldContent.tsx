import Image from "next/image";
import { averageFootballShieldRating, type FootballShieldStats } from "@/lib/cards/footballRatings";
import { FootballShieldStatsRow } from "./FootballShieldStatsRow";
import { PlayStyleStrip } from "./PlayStyleIcon";
import type { ReactNode } from "react";
export { FOOTBALL_SHIELD_STATS, averageFootballShieldRating, type FootballShieldStats } from "@/lib/cards/footballRatings";

interface FootballShieldContentProps {
  name: string;
  position?: string;
  stats?: FootballShieldStats;
  playStyleIds?: readonly string[];
  media?: ReactNode;
}

/** FC-inspired order: name, six horizontal stats (label over value), club crest. */
export function FootballShieldContent({ name, position, stats, playStyleIds, media }: FootballShieldContentProps) {
  const average = averageFootballShieldRating(stats);
  return (
    <div className="relative h-full">
      {media ? <div className="pointer-events-none absolute left-[30%] top-[8%] h-[30%] w-[65%]" data-card-media>{media}</div> : null}
      <div className="absolute left-0 top-0 flex flex-col text-center leading-none">
        <span aria-label={average === null ? "Gemiddelde nog niet beschikbaar" : `Gemiddelde ${average}`} className="text-[17cqw] font-bold tabular-nums tracking-tighter">{average ?? "—"}</span>
        <span className="mt-[1cqw] text-[5cqw] font-semibold">{position || "—"}</span>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center text-center">
        <p title={name} className="line-clamp-2 w-full break-words text-[7cqw] font-bold uppercase leading-tight tracking-tight">{name}</p>
        <div className="mt-[3cqw] w-full"><FootballShieldStatsRow stats={stats} /></div>
        <Image src="/logos/dia.png" alt="DIA" width={180} height={200} className="mt-[2.5cqw] h-[13cqw] w-auto object-contain" />
        <div className="mt-[1.5cqw] h-[9cqw] shrink-0" data-card-badges>
          <PlayStyleStrip ids={playStyleIds ?? []} />
        </div>
      </div>
    </div>
  );
}
