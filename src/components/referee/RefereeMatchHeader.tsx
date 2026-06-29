"use client";

import { TeamLogo } from "@/components/TeamLogo";
import { MatchClock } from "@/components/match/MatchClock";
import type { MatchStatus } from "@/components/match/types";
import { formatMatchDateNl, formatMatchTimeNl } from "@/lib/dateUtils";

type RefereeMatchHeaderProps = {
  status: MatchStatus;
  statusLabel: string;
  surfaceClasses: string;
  isLive: boolean;
  isScheduled: boolean;
  scheduledAt?: number;
  currentQuarter: number;
  quarterCount: number;
  regulationDurationMinutes: number;
  quarterStartedAt?: number;
  pausedAt?: number;
  accumulatedPauseTime?: number;
  frozenClockMs?: number;
  homeScore: number;
  awayScore: number;
  homeName: string;
  awayName: string;
  homeLogoUrl: string | null;
  awayLogoUrl: string | null;
};

export function RefereeMatchHeader({
  status,
  statusLabel,
  surfaceClasses,
  isLive,
  isScheduled,
  scheduledAt,
  currentQuarter,
  quarterCount,
  regulationDurationMinutes,
  quarterStartedAt,
  pausedAt,
  accumulatedPauseTime,
  frozenClockMs,
  homeScore,
  awayScore,
  homeName,
  awayName,
  homeLogoUrl,
  awayLogoUrl,
}: RefereeMatchHeaderProps) {
  return (
    <header
      className={`shrink-0 bg-gradient-to-b ${surfaceClasses} px-3 pb-3 pt-3 text-center text-white sm:px-5 sm:pb-5 sm:pt-5`}
    >
      <div className="mx-auto max-w-md">
        <div className="mb-2 sm:mb-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-sm font-medium">
            {isLive && <span className="h-2 w-2 animate-pulse rounded-full bg-white" />}
            {statusLabel}
          </span>
        </div>

        {isScheduled && scheduledAt != null && (
          <p className="mb-2 text-xs tabular-nums text-white/90 sm:mb-3 sm:text-sm">
            <time dateTime={new Date(scheduledAt).toISOString()}>
              {formatMatchDateNl(scheduledAt)} · {formatMatchTimeNl(scheduledAt)}
            </time>
          </p>
        )}

        <div className="rounded-[1.35rem] border border-white/20 bg-black/20 px-3 py-2.5 shadow-2xl backdrop-blur-sm sm:rounded-[1.75rem] sm:px-4 sm:py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-white/70">
            Wedstrijdklok
          </p>
          <div className="mt-1.5 flex flex-col items-center sm:mt-2">
            <MatchClock
              currentQuarter={currentQuarter}
              quarterCount={quarterCount}
              regulationDurationMinutes={regulationDurationMinutes}
              quarterStartedAt={quarterStartedAt}
              pausedAt={pausedAt}
              accumulatedPauseTime={accumulatedPauseTime}
              frozenClockMs={frozenClockMs}
              status={status}
              className="font-sans text-[2.7rem] font-medium leading-none tracking-[-0.03em] text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)] sm:text-6xl"
            />
          </div>
        </div>

        <div className="mt-2 flex items-baseline justify-center gap-3 font-sans tabular-nums sm:mt-4 sm:gap-4">
          <span className="text-3xl font-medium tracking-[-0.03em] sm:text-5xl">
            {homeScore}
          </span>
          <span className="text-2xl font-medium text-white/85 sm:text-4xl">-</span>
          <span className="text-3xl font-medium tracking-[-0.03em] sm:text-5xl">
            {awayScore}
          </span>
        </div>

        <div className="mx-auto mt-1.5 flex max-w-lg items-start justify-between gap-2 text-[11px] opacity-90 sm:mt-3 sm:gap-3 sm:text-sm">
          <TeamSummary name={homeName} logoUrl={homeLogoUrl} />
          <span className="shrink-0 pt-6 text-xs opacity-75">vs</span>
          <TeamSummary name={awayName} logoUrl={awayLogoUrl} />
        </div>
      </div>
    </header>
  );
}

function TeamSummary({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl: string | null;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
      <TeamLogo
        logoUrl={logoUrl}
        teamName={name}
        size="sm"
        className="ring-2 ring-white/30"
      />
      <span className="text-center font-medium leading-tight">{name}</span>
    </div>
  );
}
