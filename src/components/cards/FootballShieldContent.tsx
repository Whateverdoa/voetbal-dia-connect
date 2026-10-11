import Image from "next/image";
import { averageFootballShieldRating, type FootballShieldStats } from "@/lib/cards/footballRatings";
import { FootballShieldStatsRow } from "./FootballShieldStatsRow";
export { FOOTBALL_SHIELD_STATS, averageFootballShieldRating, type FootballShieldStats } from "@/lib/cards/footballRatings";

interface FootballShieldContentProps {
  name: string;
  position?: string;
  stats?: FootballShieldStats;
}

/** FC-inspired order: name, six horizontal stats (label over value), club crest. */
export function FootballShieldContent({ name, position, stats }: FootballShieldContentProps) {
  const average = averageFootballShieldRating(stats);
  return (
    <div className="relative h-full">
      <div className="absolute left-0 top-0 flex flex-col text-center leading-none">
        <span aria-label={average === null ? "Gemiddelde nog niet beschikbaar" : `Gemiddelde ${average}`} className="text-[17cqw] font-bold tabular-nums tracking-tighter">{average ?? "—"}</span>
        <span className="mt-[1cqw] text-[5cqw] font-semibold">{position || "—"}</span>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center text-center">
        <p title={name} className="line-clamp-2 w-full break-words text-[5.8cqw] font-bold uppercase leading-tight tracking-tight">{name}</p>
        <div className="mt-[2cqw] w-full"><FootballShieldStatsRow stats={stats} /></div>
        <Image src="/logos/dia.png" alt="DIA" width={64} height={64} className="mt-[2cqw] h-[10cqw] w-[10cqw] object-contain" />
      </div>
    </div>
  );
}
