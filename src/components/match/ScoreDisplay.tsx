"use client";

import { StatusBadge } from "@/components/StatusBadge";
import { TeamLogo } from "@/components/TeamLogo";
import { formatMatchDateNl, formatMatchTimeNl } from "@/lib/dateUtils";
import { MatchClock } from "./MatchClock";
import type { MatchStatus } from "./types";

interface ScoreDisplayProps {
  homeScore: number;
  awayScore: number;
  teamName: string;
  opponent: string;
  isHome: boolean;
  status: MatchStatus;
  currentQuarter: number;
  quarterCount: number;
  regulationDurationMinutes?: number;
  quarterStartedAt?: number;
  pausedAt?: number;
  accumulatedPauseTime?: number;
  publicCode: string;
  scheduledAt?: number;
  homeLogoUrl?: string | null;
  awayLogoUrl?: string | null;
}

export function ScoreDisplay({
  homeScore,
  awayScore,
  teamName,
  opponent,
  isHome,
  status,
  currentQuarter,
  quarterCount,
  regulationDurationMinutes = 60,
  quarterStartedAt,
  pausedAt,
  accumulatedPauseTime,
  publicCode,
  scheduledAt,
  homeLogoUrl,
  awayLogoUrl,
}: ScoreDisplayProps) {
  const isLive = status === "live";
  const isPaused = isLive && pausedAt != null;
  const isHalftime = status === "halftime";
  const isFinished = status === "finished";

  // Determine quarter/period label
  const getQuarterLabel = () => {
    if (isHalftime) return "Rust";
    if (isFinished) return "Afgelopen";
    if (isPaused) {
      const base = quarterCount === 2 ? `Helft ${currentQuarter}` : `Kwart ${currentQuarter}`;
      return `${base} — Gepauzeerd`;
    }
    if (isLive) {
      if (quarterCount === 2) {
        return `Helft ${currentQuarter}`;
      }
      return `Kwart ${currentQuarter}`;
    }
    return null;
  };

  const quarterLabel = getQuarterLabel();

  return (
    <div className="bg-dia-green text-white p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Top row: public code and status */}
        <div className="flex items-center justify-between mb-4">
          <span className="font-mono text-sm bg-white/20 px-2 py-1 rounded">
            {publicCode}
          </span>
          <StatusBadge status={status} size="md" />
        </div>

        {scheduledAt != null && (
          <p className="text-center text-sm text-white/90 tabular-nums mb-3">
            <time dateTime={new Date(scheduledAt).toISOString()}>
              {formatMatchDateNl(scheduledAt)} · {formatMatchTimeNl(scheduledAt)}
            </time>
          </p>
        )}

        {/* Score - HUGE and centered */}
        <div className="text-center py-4">
          <div className="text-7xl sm:text-8xl font-bold tabular-nums tracking-tight">
            {homeScore} - {awayScore}
          </div>
          {quarterLabel && (
            <div className="mt-2 text-lg font-medium opacity-90 flex items-center justify-center gap-2">
              <span>{quarterLabel}</span>
              {isLive && (
                <MatchClock
                  currentQuarter={currentQuarter}
                  quarterCount={quarterCount}
                  regulationDurationMinutes={regulationDurationMinutes}
                  quarterStartedAt={quarterStartedAt}
                  pausedAt={pausedAt}
                  accumulatedPauseTime={accumulatedPauseTime}
                  status={status}
                />
              )}
            </div>
          )}
        </div>

        {/* Team names + logos */}
        <div className="flex justify-between items-center text-sm sm:text-base opacity-90 gap-2">
          <div className="text-left flex flex-col items-start gap-1 min-w-0 flex-1">
            <TeamLogo
              logoUrl={homeLogoUrl ?? null}
              teamName={isHome ? teamName : opponent}
              size="md"
              className="ring-2 ring-white/30"
            />
            <p className="font-medium truncate w-full">{isHome ? teamName : opponent}</p>
            <p className="text-xs opacity-75">{isHome ? "Thuis" : "Uit"}</p>
          </div>
          <div className="text-center text-xs opacity-75 shrink-0 pt-6">vs</div>
          <div className="text-right flex flex-col items-end gap-1 min-w-0 flex-1">
            <TeamLogo
              logoUrl={awayLogoUrl ?? null}
              teamName={isHome ? opponent : teamName}
              size="md"
              className="ring-2 ring-white/30"
            />
            <p className="font-medium truncate w-full">{isHome ? opponent : teamName}</p>
            <p className="text-xs opacity-75">{isHome ? "Uit" : "Thuis"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
