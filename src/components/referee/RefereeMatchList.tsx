"use client";

import Link from "next/link";

interface RefereeMatch {
  id: string;
  publicCode: string;
  opponent: string;
  isHome: boolean;
  status: string;
  currentQuarter: number;
  quarterCount: number;
  homeScore: number;
  awayScore: number;
  scheduledAt?: number;
  startedAt?: number;
  finishedAt?: number;
  teamName: string;
}

interface RefereeMatchListProps {
  refereeName: string;
  matches: RefereeMatch[];
  pin: string;
  onLogout: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: "Gepland",
  lineup: "Opstelling",
  live: "Live",
  halftime: "Rust",
  finished: "Afgelopen",
};

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700",
  lineup: "bg-purple-100 text-purple-700",
  live: "bg-red-100 text-red-700",
  halftime: "bg-orange-100 text-orange-700",
  finished: "bg-gray-100 text-gray-600",
};

function formatDate(timestamp?: number): string {
  if (!timestamp) return "";
  const d = new Date(timestamp);
  const day = d.toLocaleDateString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const time = d.toLocaleTimeString("nl-NL", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${day} ${time}`;
}

/** Card for a single match the referee can tap to enter */
function MatchCard({ match, pin }: { match: RefereeMatch; pin: string }) {
  const isActive = match.status === "live" || match.status === "halftime";
  const isFinished = match.status === "finished";
  const homeName = match.isHome ? match.teamName : match.opponent;
  const awayName = match.isHome ? match.opponent : match.teamName;

  const href = `/scheidsrechter/match/${match.id}?pin=${encodeURIComponent(pin)}&code=${match.publicCode}`;

  return (
    <Link
      href={href}
      className={`block rounded-xl shadow-md overflow-hidden transition-transform active:scale-[0.98]
                  ${isActive ? "ring-2 ring-red-400" : "hover:shadow-lg"}`}
    >
      {/* Status bar */}
      <div
        className={`px-4 py-1.5 flex items-center justify-between text-xs font-semibold
                    ${isActive ? "bg-red-600 text-white" : "bg-gray-50 text-gray-500"}`}
      >
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-bold
                      ${isActive ? "bg-white/20 text-white" : STATUS_COLORS[match.status] ?? "bg-gray-100 text-gray-600"}`}
        >
          {isActive && (
            <span className="inline-block w-1.5 h-1.5 bg-white rounded-full animate-pulse mr-1 align-middle" />
          )}
          {STATUS_LABELS[match.status] ?? match.status}
        </span>
        {match.scheduledAt && !match.startedAt && (
          <span className="text-gray-400">{formatDate(match.scheduledAt)}</span>
        )}
        {match.startedAt && (
          <span className="opacity-70">
            {match.status === "live"
              ? `Kwart ${match.currentQuarter}`
              : match.status === "halftime"
                ? "Rust"
                : ""}
          </span>
        )}
      </div>

      {/* Match content */}
      <div className="px-4 py-4 bg-white">
        <div className="flex items-center justify-between">
          {/* Home */}
          <div className="flex-1 text-left">
            <p className="font-semibold text-gray-800 text-sm leading-tight">
              {homeName}
            </p>
          </div>

          {/* Score / vs */}
          <div className="px-4 text-center min-w-[80px]">
            {match.startedAt || isFinished ? (
              <p className="text-2xl font-bold tabular-nums text-gray-900">
                {match.homeScore} - {match.awayScore}
              </p>
            ) : (
              <p className="text-lg text-gray-400 font-medium">vs</p>
            )}
          </div>

          {/* Away */}
          <div className="flex-1 text-right">
            <p className="font-semibold text-gray-800 text-sm leading-tight">
              {awayName}
            </p>
          </div>
        </div>
      </div>

      {/* Tap hint */}
      <div className="bg-dia-green/5 px-4 py-2 text-center">
        <span className="text-xs font-medium text-dia-green">
          Tik om te openen →
        </span>
      </div>
    </Link>
  );
}

/**
 * Shows the referee's assigned matches after PIN login.
 * Matches are sorted: live/halftime first, then scheduled, then finished.
 */
export function RefereeMatchList({
  refereeName,
  matches,
  pin,
  onLogout,
}: RefereeMatchListProps) {
  return (
    <main className="min-h-screen bg-gray-100 pb-8">
      {/* Top bar */}
      <nav className="bg-gray-800 text-white px-4 py-2 sticky top-0 z-20">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <button
            onClick={onLogout}
            className="text-sm opacity-80 hover:opacity-100 flex items-center gap-1 min-h-[44px] px-2 -ml-2"
          >
            ← Uitloggen
          </button>
          <span className="bg-amber-400 text-gray-900 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
            Scheidsrechter
          </span>
        </div>
      </nav>

      {/* Welcome header */}
      <header className="bg-gradient-to-b from-dia-green to-green-700 p-6 text-white text-center">
        <p className="text-sm opacity-80">Welkom</p>
        <h1 className="text-2xl font-bold">{refereeName}</h1>
        <p className="text-sm opacity-80 mt-1">
          {matches.length === 0
            ? "Geen wedstrijden toegewezen"
            : matches.length === 1
              ? "1 wedstrijd"
              : `${matches.length} wedstrijden`}
        </p>
      </header>

      {/* Match list */}
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {matches.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-6 text-center space-y-2">
            <p className="text-gray-500">
              Er zijn nog geen wedstrijden aan je toegewezen.
            </p>
            <p className="text-sm text-gray-400">
              Vraag de coach om je toe te wijzen via het wedstrijdscherm.
            </p>
          </div>
        ) : (
          matches.map((match) => (
            <MatchCard key={match.id} match={match} pin={pin} />
          ))
        )}
      </div>
    </main>
  );
}
