import Link from "next/link";
import { StatusBadge, MatchStatus } from "../StatusBadge";
import { MatchVersusLogos } from "@/components/MatchVersusLogos";

export interface DashboardMatch {
  _id: string;
  teamId: string;
  opponent: string;
  isHome: boolean;
  status: "scheduled" | "lineup" | "live" | "halftime" | "finished";
  currentQuarter: number;
  homeScore: number;
  awayScore: number;
  publicCode: string;
  scheduledAt?: number;
  teamName?: string;
  teamLogoUrl?: string | null;
  clubLogoUrl?: string | null;
  opponentLogoUrl?: string | null;
}

export function DashboardMatchCard({
  match,
  compact = false,
  diaTeamName,
}: {
  match: DashboardMatch;
  compact?: boolean;
  diaTeamName?: string;
}) {
  const diaLabel = diaTeamName ?? match.teamName ?? "Team";
  const isActive =
    match.status === "live" ||
    match.status === "halftime" ||
    match.status === "lineup";
  const showScore = match.status !== "scheduled";

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("nl-NL", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("nl-NL", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div
      className={`rounded-xl border-2 ${
        isActive
          ? "border-dia-yellow-deep/50 bg-dia-green-light shadow-md"
          : "border-gray-200 bg-white shadow-sm"
      } ${compact ? "p-3" : "p-4"}`}
    >
      <Link
        href={`/coach/match/${match._id}`}
        className="block active:scale-[0.98] touch-manipulation"
      >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="mb-2">
            <MatchVersusLogos
              isHome={match.isHome}
              teamName={diaLabel}
              opponent={match.opponent}
              teamLogoUrl={match.teamLogoUrl}
              clubLogoUrl={match.clubLogoUrl}
              opponentLogoUrl={match.opponentLogoUrl}
              size="sm"
            />
          </div>
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={match.status as MatchStatus} size="sm" />
            {isActive && match.status === "live" && (
              <span className="text-xs text-dia-black font-medium">
                K{match.currentQuarter}
              </span>
            )}
          </div>
          <p
            className={`font-semibold text-gray-900 truncate ${compact ? "text-sm" : ""}`}
          >
            {match.isHome ? "vs " : "@ "}
            {match.opponent}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {match.scheduledAt && (
              <span className="text-xs text-gray-500">
                {formatDate(match.scheduledAt)} {formatTime(match.scheduledAt)}
              </span>
            )}
            <span className="font-mono text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
              {match.publicCode}
            </span>
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          {showScore ? (
            <div
              className={`font-bold tabular-nums ${
                isActive ? "text-dia-black" : "text-gray-900"
              } ${compact ? "text-2xl" : "text-3xl"}`}
            >
              {match.homeScore} - {match.awayScore}
            </div>
          ) : (
            <div
              className={`text-gray-400 font-medium ${compact ? "text-xl" : "text-2xl"}`}
            >
              - - -
            </div>
          )}
        </div>
      </div>
      </Link>
      {match.status !== "finished" ? (
        <Link
          href={`/present/match/${match.publicCode}/kleedkamer?tab=opstelling`}
          className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-dia-black px-3 py-2 text-sm font-semibold text-dia-yellow"
        >
          Toon opstelling
        </Link>
      ) : null}
    </div>
  );
}
