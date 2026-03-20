"use client";

import { ResultBadge, type MatchResult } from "./ResultBadge";

export interface HistoryMatch {
  id: string;
  opponent: string;
  isHome: boolean;
  homeScore: number;
  awayScore: number;
  scheduledAt?: number;
  scorers: string[];
}

interface HistoryMatchCardProps {
  match: HistoryMatch;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function HistoryMatchCard({ match }: HistoryMatchCardProps) {
  // Determine result (W/D/L) from our perspective
  const ourScore = match.isHome ? match.homeScore : match.awayScore;
  const theirScore = match.isHome ? match.awayScore : match.homeScore;

  const result: MatchResult =
    ourScore > theirScore ? "W" : ourScore < theirScore ? "L" : "D";

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Match info */}
          <div className="flex-1 min-w-0">
            {/* Date */}
            {match.scheduledAt && (
              <p className="text-sm text-gray-500 mb-1">
                {formatDate(match.scheduledAt)}
              </p>
            )}
            {/* Opponent */}
            <p className="font-semibold text-gray-900 truncate">
              {match.isHome ? "vs " : "@ "}
              {match.opponent}
            </p>
            {/* Scorers */}
            {match.scorers.length > 0 && (
              <p className="text-sm text-gray-600 mt-1 truncate">
                ⚽ {match.scorers.join(", ")}
              </p>
            )}
          </div>

          {/* Right: Score and result */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-2xl font-bold tabular-nums text-gray-900">
              {match.homeScore} - {match.awayScore}
            </div>
            <ResultBadge result={result} />
          </div>
        </div>
      </div>
    </div>
  );
}
