"use client";

import Link from "next/link";
import clsx from "clsx";
import type { PublicMatch } from "@/types/publicMatch";
import { formatMatchDate } from "@/types/publicMatch";
import { TeamLogo } from "@/components/TeamLogo";
import { resolveLogoUrl } from "@/lib/logos";

type Props = {
  match: PublicMatch;
};

/** Full-width list row for the homepage match browser (single column stack). */
export function MatchBrowserCard({ match }: Props) {
  const isLive = match.status === "live" || match.status === "halftime";
  const showScore = match.status !== "scheduled";
  const diaLogo = resolveLogoUrl(match.teamLogoUrl, match.clubLogoUrl);

  const homeName = match.isHome ? match.teamName : match.opponent;
  const awayName = match.isHome ? match.opponent : match.teamName;
  const homeLogo = match.isHome ? diaLogo : (match.opponentLogoUrl ?? null);
  const awayLogo = match.isHome ? (match.opponentLogoUrl ?? null) : diaLogo;

  const timeColumn =
    isLive ? (
      <div className="flex flex-col gap-0.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-green-600">Live</span>
        <span className="text-[10px] text-gray-500">
          {match.status === "halftime" ? "Rust" : `K${match.currentQuarter}`}
        </span>
      </div>
    ) : match.status === "scheduled" && match.scheduledAt ? (
      <div className="flex flex-col gap-0.5 text-[11px] leading-tight text-gray-600">
        <span className="font-medium tabular-nums">{formatMatchDate(match.scheduledAt)}</span>
        <span className="text-[10px] text-gray-400">Gepland</span>
      </div>
    ) : match.status === "finished" && match.scheduledAt ? (
      <div className="flex flex-col gap-0.5 text-[11px] leading-tight text-gray-500">
        <span className="tabular-nums">{formatMatchDate(match.scheduledAt)}</span>
        <span className="text-[10px]">Afgelopen</span>
      </div>
    ) : (
      <span className="text-[11px] text-gray-400">—</span>
    );

  return (
    <Link
      href={`/live/${match.publicCode}`}
      className={clsx(
        "flex w-full max-w-full flex-row items-stretch gap-3 rounded-xl border bg-white p-3 touch-manipulation transition-all active:scale-[0.99] sm:gap-4 sm:p-4",
        isLive
          ? "border-green-200 shadow-sm hover:border-green-300 hover:shadow-md"
          : "border-gray-200 shadow-sm hover:border-gray-300 hover:shadow-md"
      )}
    >
      <div className="flex w-[5.5rem] shrink-0 flex-col justify-center sm:w-28">{timeColumn}</div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <TeamLogo logoUrl={homeLogo} teamName={homeName} size="sm" className="shrink-0" />
            <span className="truncate font-semibold text-gray-900 text-sm">{homeName}</span>
          </div>
          <div className="flex shrink-0 items-center gap-2 tabular-nums">
            {showScore ? (
              <span
                className={clsx(
                  "text-lg font-bold sm:text-xl",
                  isLive ? "text-green-600" : "text-gray-800"
                )}
              >
                {match.homeScore} - {match.awayScore}
              </span>
            ) : (
              <span className="text-sm font-medium text-gray-300">vs</span>
            )}
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <span className="truncate text-right font-semibold text-gray-900 text-sm">{awayName}</span>
            <TeamLogo logoUrl={awayLogo} teamName={awayName} size="sm" className="shrink-0" />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-500">
          <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{match.publicCode}</span>
          {match.refereeAssigned === true && (
            <span
              title={
                match.refereePublicName
                  ? `Scheidsrechter: ${match.refereePublicName}`
                  : "Scheidsrechter toegewezen (naam alleen als diegene dat zelf wil)"
              }
            >
              {match.refereePublicName
                ? `Scheidsrechter: ${match.refereePublicName}`
                : "Scheidsrechter toegewezen"}
            </span>
          )}
          {match.refereeAssigned === false && (
            <span className="text-amber-700/90">Geen scheidsrechter</span>
          )}
        </div>
      </div>
    </Link>
  );
}
