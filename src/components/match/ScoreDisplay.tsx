"use client";

import { StatusBadge } from "@/components/StatusBadge";
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
  quarterStartedAt?: number;
  publicCode: string;
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
  quarterStartedAt,
  publicCode,
}: ScoreDisplayProps) {
  const isLive = status === "live";
  const isHalftime = status === "halftime";
  const isFinished = status === "finished";

  // Determine quarter/period label
  const getQuarterLabel = () => {
    if (isHalftime) return "Rust";
    if (isFinished) return "Afgelopen";
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

        {/* Score - HUGE and centered */}
        <div className="text-center py-4">
          <div className="text-7xl sm:text-8xl font-bold tabular-nums tracking-tight">
            {homeScore} - {awayScore}
          </div>
          {quarterLabel && (
            <div className="mt-2 text-lg font-medium opacity-90 flex items-center justify-center gap-2">
              <span>{quarterLabel}</span>
              {isLive && (
                <MatchClock quarterStartedAt={quarterStartedAt} status={status} />
              )}
            </div>
          )}
        </div>

        {/* Team names */}
        <div className="flex justify-between items-center text-sm sm:text-base opacity-90">
          <div className="text-left">
            <p className="font-medium">{isHome ? teamName : opponent}</p>
            <p className="text-xs opacity-75">{isHome ? "Thuis" : "Uit"}</p>
          </div>
          <div className="text-center text-xs opacity-75">vs</div>
          <div className="text-right">
            <p className="font-medium">{isHome ? opponent : teamName}</p>
            <p className="text-xs opacity-75">{isHome ? "Uit" : "Thuis"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
