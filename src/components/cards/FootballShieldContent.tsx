import Image from "next/image";
import { FOOTBALL_SHIELD_STATS, averageFootballShieldRating, type FootballShieldStats } from "@/lib/cards/footballRatings";
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
        <p title={name} className="line-clamp-2 w-full break-words text-[max(11px,7cqw)] font-bold uppercase leading-tight tracking-tight">{name}</p>
        <dl className="mt-[3cqw] grid w-full grid-cols-6 gap-[0.5cqw]">
          {FOOTBALL_SHIELD_STATS.map(({ key, label, name: statName }) => (
            <div key={key} className="min-w-0">
              <dt aria-label={statName} className="text-[max(8px,3.8cqw)] font-semibold leading-tight">{label}</dt>
              <dd className="mt-[0.5cqw] text-[max(10px,5.3cqw)] font-bold leading-none tabular-nums">{stats?.[key] ?? "—"}</dd>
            </div>
          ))}
        </dl>
        <Image src="/logos/dia.png" alt="DIA" width={64} height={64} className="mt-[3cqw] h-[12cqw] w-[12cqw] object-contain" />
      </div>
    </div>
  );
}
