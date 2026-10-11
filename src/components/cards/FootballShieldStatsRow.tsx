import { FOOTBALL_SHIELD_STATS, type FootballShieldStats } from "@/lib/cards/footballRatings";
import { FC_ATTRIBUTES } from "@/lib/cards/fc27";
import { PlayStyleIcon } from "./PlayStyleIcon";

/** One aligned column per attribute: pictogram, abbreviation, then score. */
export function FootballShieldStatsRow({ stats }: { stats?: FootballShieldStats }) {
  return (
    <dl className="grid w-full grid-cols-6 gap-[1cqw] text-center" data-card-stats>
      {FOOTBALL_SHIELD_STATS.map(({ key, label, name }, index) => (
        <div key={key} className="flex min-w-0 flex-col items-center">
          <PlayStyleIcon styleId={FC_ATTRIBUTES[index].icon} decorative className="mb-[0.8cqw] h-[6cqw] w-[6cqw] shrink-0" />
          <dt aria-label={name} className="w-full whitespace-nowrap text-[4.2cqw] font-bold leading-none tracking-normal">{label}</dt>
          <dd className="mt-[0.8cqw] text-[6.2cqw] font-extrabold leading-none tabular-nums">{stats?.[key] ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
