import { FOOTBALL_SHIELD_STATS, type FootballShieldStats } from "@/lib/cards/footballRatings";

/** Fixed order and equal columns keep labels directly above their scores. */
export function FootballShieldStatsRow({ stats }: { stats?: FootballShieldStats }) {
  return (
    <dl className="grid w-full grid-cols-6 gap-[0.5cqw] text-center" data-card-stats>
      {FOOTBALL_SHIELD_STATS.map(({ key, label, name }) => (
        <div key={key} className="flex min-w-0 flex-col items-center">
          <dt aria-label={name} className="w-full whitespace-nowrap text-[max(9px,3.8cqw)] font-semibold leading-tight">{label}</dt>
          <dd className="mt-[0.5cqw] text-[5.3cqw] font-bold leading-none tabular-nums">{stats?.[key] ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
