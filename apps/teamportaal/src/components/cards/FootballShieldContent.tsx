import Image from "next/image";
import type { IconLanguage, PlayStyleId } from "@/lib/cards/playStyles";
import { PlayStyleStrip } from "./PlayStyleIcon";

export const FOOTBALL_SHIELD_STATS = [
  { key: "pace", label: "SNL", name: "Snelheid" },
  { key: "shooting", label: "SCH", name: "Schieten" },
  { key: "passing", label: "PAS", name: "Passen" },
  { key: "dribbling", label: "DRI", name: "Dribbelen" },
  { key: "defending", label: "VRD", name: "Verdedigen" },
  { key: "physical", label: "FYS", name: "Fysiek" },
] as const;

export type FootballShieldStats = Partial<
  Record<(typeof FOOTBALL_SHIELD_STATS)[number]["key"], number>
>;

interface FootballShieldContentProps {
  name: string;
  position?: string;
  stats?: FootballShieldStats;
  /** Large-card decoration only; never contributes to the average. */
  playStyleIds?: readonly PlayStyleId[];
  iconLanguage?: IconLanguage;
}

/** A complete, valid six-stat profile is required for a meaningful overall average. */
export function averageFootballShieldRating(
  stats?: FootballShieldStats,
): number | null {
  const values = FOOTBALL_SHIELD_STATS.map(({ key }) => stats?.[key]);
  if (
    values.some(
      (value) =>
        value === undefined ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > 99,
    )
  )
    return null;
  return Math.round(
    values.reduce<number>((sum, value) => sum + (value ?? 0), 0) /
      FOOTBALL_SHIELD_STATS.length,
  );
}

/** FC-inspired order: name, six horizontal stats (label over value), club crest. */
export function FootballShieldContent({
  name,
  position,
  stats,
  playStyleIds,
  iconLanguage,
}: FootballShieldContentProps) {
  const average = averageFootballShieldRating(stats);
  return (
    <div className="relative h-full">
      <div className="absolute left-0 top-0 flex flex-col text-center leading-none">
        <span
          aria-label={
            average === null
              ? "Gemiddelde nog niet beschikbaar"
              : `Gemiddelde ${average}`
          }
          className="text-[17cqw] font-bold tabular-nums tracking-tighter"
        >
          {average ?? "—"}
        </span>
        <span className="mt-[1cqw] text-[5cqw] font-semibold">
          {position || "—"}
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center text-center">
        <p
          title={name}
          className="line-clamp-2 w-full break-words text-[7cqw] font-bold uppercase leading-tight tracking-tight"
        >
          {name}
        </p>
        <dl className="mt-[3cqw] grid w-full grid-cols-6 gap-[0.5cqw]">
          {FOOTBALL_SHIELD_STATS.map(({ key, label, name: statName }) => (
            <div key={key} className="min-w-0">
              <dt
                aria-label={statName}
                className="text-[3.8cqw] font-semibold leading-tight"
              >
                {label}
              </dt>
              <dd className="mt-[0.5cqw] text-[5.3cqw] font-bold leading-none tabular-nums">
                {stats?.[key] ?? "—"}
              </dd>
            </div>
          ))}
        </dl>
        <Image
          src="/logos/dia.png"
          alt="DIA"
          width={180}
          height={200}
          className="mt-[2.5cqw] h-[13cqw] w-auto object-contain"
        />
        {/* Reserve the badge row so adding qualities never moves the crest or statistics. */}
        <div className="mt-[1.5cqw] h-[9cqw] shrink-0">
          {playStyleIds?.length ? (
            <PlayStyleStrip ids={playStyleIds} language={iconLanguage} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
