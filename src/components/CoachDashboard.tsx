"use client";

import { useState } from "react";
import Link from "next/link";
import { LogOut, Plus, Users } from "lucide-react";
import { StatusBadge, MatchStatus } from "./StatusBadge";

interface DashboardMatch {
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
}

interface CoachDashboardProps {
  data: {
    coach: { id: string; name: string };
    teams: { id: string; name: string }[];
    matches: DashboardMatch[];
  };
  pin: string;
  onLogout: () => void;
}

export function CoachDashboard({ data, pin, onLogout }: CoachDashboardProps) {
  const matchesByTeam = data.teams.map((team) => ({
    team,
    matches: data.matches.filter((m) => m.teamId === team.id),
  }));

  const liveMatches = data.matches.filter(
    (m) => m.status === "live" || m.status === "halftime" || m.status === "lineup"
  );

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <header className="bg-dia-green text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg font-bold">Welkom, {data.coach.name}!</h1>
                <p className="text-sm text-white/80">
                  {data.teams.map((t) => t.name).join(" • ")}
                </p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors min-h-[44px]"
              aria-label="Uitloggen"
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm font-medium hidden sm:inline">Uitloggen</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-6">
        {liveMatches.length > 0 && (
          <section className="bg-red-50 border-2 border-red-200 rounded-2xl p-4">
            <h2 className="text-lg font-bold text-red-700 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              Actieve wedstrijden
            </h2>
            <div className="space-y-3">
              {liveMatches.map((match) => (
                <DashboardMatchCard key={match._id} match={match} pin={pin} />
              ))}
            </div>
          </section>
        )}

        {matchesByTeam.map(({ team, matches }) => (
          <TeamSection key={team.id} team={team} matches={matches} pin={pin} />
        ))}
      </div>
    </main>
  );
}

function TeamSection({
  team,
  matches,
  pin,
}: {
  team: { id: string; name: string };
  matches: DashboardMatch[];
  pin: string;
}) {
  const [showAllFinished, setShowAllFinished] = useState(false);
  const scheduledMatches = matches.filter((m) => m.status === "scheduled");
  const finishedMatches = matches.filter((m) => m.status === "finished");
  const visibleFinished = showAllFinished
    ? finishedMatches
    : finishedMatches.slice(0, 3);
  const hiddenCount = finishedMatches.length - 3;

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{team.name}</h2>
          <span className="text-sm text-gray-500">
            {matches.length} wedstrijd{matches.length !== 1 ? "en" : ""}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <Link
          href={`/coach/new?pin=${pin}&teamId=${team.id}`}
          className="flex items-center justify-center gap-2 w-full py-4 px-4 
            bg-dia-green text-white font-semibold rounded-xl text-lg
            min-h-[56px] active:scale-[0.98] transition-all
            shadow-sm hover:shadow-md hover:bg-dia-green-light"
        >
          <Plus className="w-5 h-5" />
          Nieuwe wedstrijd
        </Link>

        {scheduledMatches.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Gepland
            </h3>
            <div className="space-y-2">
              {scheduledMatches.map((match) => (
                <DashboardMatchCard key={match._id} match={match} pin={pin} compact />
              ))}
            </div>
          </div>
        )}

        {finishedMatches.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Afgelopen
            </h3>
            <div className="space-y-2">
              {visibleFinished.map((match) => (
                <DashboardMatchCard key={match._id} match={match} pin={pin} compact />
              ))}
              {hiddenCount > 0 && (
                <button
                  onClick={() => setShowAllFinished(!showAllFinished)}
                  className="w-full text-sm text-dia-green font-medium text-center py-2
                             hover:bg-dia-green/5 rounded-lg transition-colors min-h-[44px]"
                >
                  {showAllFinished
                    ? "Minder tonen ▲"
                    : `+${hiddenCount} meer tonen ▼`}
                </button>
              )}
            </div>
          </div>
        )}

        {matches.length === 0 && (
          <p className="text-center text-gray-500 py-4">
            Nog geen wedstrijden voor dit team
          </p>
        )}
      </div>
    </section>
  );
}

function DashboardMatchCard({
  match,
  pin,
  compact = false,
}: {
  match: DashboardMatch;
  pin: string;
  compact?: boolean;
}) {
  const isActive =
    match.status === "live" || match.status === "halftime" || match.status === "lineup";
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
    <Link
      href={`/coach/match/${match._id}?pin=${pin}`}
      className={`block rounded-xl border-2 transition-all active:scale-[0.98] touch-manipulation ${
        isActive
          ? "border-red-300 bg-red-50 shadow-md hover:shadow-lg"
          : "border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-gray-300"
      } ${compact ? "p-3" : "p-4"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={match.status as MatchStatus} size="sm" />
            {isActive && match.status === "live" && (
              <span className="text-xs text-red-600 font-medium">
                K{match.currentQuarter}
              </span>
            )}
          </div>
          <p className={`font-semibold text-gray-900 truncate ${compact ? "text-sm" : ""}`}>
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
                isActive ? "text-red-600" : "text-gray-900"
              } ${compact ? "text-2xl" : "text-3xl"}`}
            >
              {match.homeScore} - {match.awayScore}
            </div>
          ) : (
            <div className={`text-gray-400 font-medium ${compact ? "text-xl" : "text-2xl"}`}>
              - - -
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export type { DashboardMatch };
