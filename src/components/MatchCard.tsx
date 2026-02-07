"use client";

import Link from "next/link";
import clsx from "clsx";
import { StatusBadge, MatchStatus } from "./StatusBadge";

interface MatchCardProps {
  match: {
    _id: string;
    opponent: string;
    isHome: boolean;
    status: MatchStatus;
    homeScore: number;
    awayScore: number;
    currentQuarter: number;
    publicCode: string;
    scheduledAt?: number;
  };
  pin: string;
  compact?: boolean;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MatchCard({ match, pin, compact = false }: MatchCardProps) {
  const isActive = match.status === "live" || match.status === "halftime" || match.status === "lineup";
  const showScore = match.status !== "scheduled";

  return (
    <Link
      href={`/coach/match/${match._id}?pin=${pin}`}
      className={clsx(
        "block rounded-xl border-2 transition-all active:scale-[0.98]",
        "min-h-[72px] touch-manipulation",
        isActive
          ? "border-red-300 bg-red-50 shadow-md hover:shadow-lg"
          : "border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-gray-300"
      )}
    >
      <div className={clsx("p-4", compact && "p-3")}>
        <div className="flex items-center justify-between gap-3">
          {/* Left side: Match info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <StatusBadge status={match.status} size="sm" />
              {isActive && match.status === "live" && (
                <span className="text-xs text-red-600 font-medium">
                  K{match.currentQuarter}
                </span>
              )}
            </div>
            <p className="font-semibold text-gray-900 truncate">
              {match.isHome ? "vs " : "@ "}
              {match.opponent}
            </p>
            <div className="flex items-center gap-2 mt-1">
              {match.scheduledAt && (
                <span className="text-sm text-gray-500">
                  {formatDate(match.scheduledAt)} {formatTime(match.scheduledAt)}
                </span>
              )}
              <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                {match.publicCode}
              </span>
            </div>
          </div>

          {/* Right side: Score */}
          <div className="text-right flex-shrink-0">
            {showScore ? (
              <div
                className={clsx(
                  "text-3xl font-bold tabular-nums",
                  isActive ? "text-red-600" : "text-gray-900"
                )}
              >
                {match.homeScore} - {match.awayScore}
              </div>
            ) : (
              <div className="text-2xl text-gray-400 font-medium">- - -</div>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
