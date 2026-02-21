"use client";

import { Suspense } from "react";
import { useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import type { PublicMatch } from "@/types/publicMatch";
import { formatMatchDate } from "@/types/publicMatch";

function isToday(ts: number): boolean {
  const d = new Date(ts);
  const now = new Date();
  return d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate();
}

/** Live matches are always "today" regardless of scheduledAt */
function isTodayMatch(m: PublicMatch): boolean {
  if (m.status === "live" || m.status === "halftime") return true;
  return !!m.scheduledAt && isToday(m.scheduledAt);
}

const groups = [
  {
    key: "live",
    label: "LIVE",
    filter: (m: PublicMatch) => m.status === "live" || m.status === "halftime",
    dotClass: "bg-green-500 animate-pulse",
    labelClass: "text-green-600",
  },
  {
    key: "finished",
    label: "AFGELOPEN",
    filter: (m: PublicMatch) => m.status === "finished",
    dotClass: "bg-red-500",
    labelClass: "text-red-600",
  },
  {
    key: "scheduled",
    label: "GEPLAND",
    filter: (m: PublicMatch) => m.status === "scheduled",
    dotClass: "bg-blue-500",
    labelClass: "text-blue-600",
  },
];

function ScoreRow({ match }: { match: PublicMatch }) {
  const isLive = match.status === "live" || match.status === "halftime";
  const showScore = match.status !== "scheduled";

  const leftTeam = match.isHome ? match.teamName : match.opponent;
  const rightTeam = match.isHome ? match.opponent : match.teamName;

  return (
    <div className="py-2">
      <div className="flex items-center justify-center gap-4 text-lg sm:text-xl md:text-2xl">
        <span className="flex-1 text-right font-semibold text-gray-900 truncate">
          {leftTeam}
        </span>
        {showScore ? (
          <span className={`tabular-nums font-bold min-w-[5ch] text-center ${isLive ? "text-green-600" : "text-gray-800"}`}>
            {match.homeScore} - {match.awayScore}
          </span>
        ) : (
          <span className="min-w-[5ch] text-center text-gray-300 font-medium">– – –</span>
        )}
        <span className="flex-1 text-left font-semibold text-gray-900 truncate">
          {rightTeam}
        </span>
      </div>

      {isLive && (
        <p className="text-center text-sm text-red-500 font-medium mt-0.5">
          {match.status === "halftime" ? "Rust" : `K${match.currentQuarter}`}
        </p>
      )}

      {match.status === "scheduled" && match.scheduledAt && (
        <p className="text-center text-sm text-gray-400 mt-0.5">
          {formatMatchDate(match.scheduledAt)}
        </p>
      )}
    </div>
  );
}

function StandenContent() {
  const params = useSearchParams();
  const teamFilter = params.get("team") ?? "";
  const showAll = params.get("alle") === "true";
  const hasFilter = teamFilter !== "";

  const raw = useQuery(api.matches.listPublicMatches);

  if (raw === undefined) {
    return <p className="text-center text-gray-400 py-16 text-lg">Laden...</p>;
  }

  let matches: PublicMatch[] = raw as PublicMatch[];

  // Default: show only today's matches. ?alle=true shows everything.
  if (!showAll) {
    matches = matches.filter(isTodayMatch);
  }

  if (teamFilter) {
    const q = teamFilter.toLowerCase();
    matches = matches.filter((m) => m.teamName.toLowerCase().includes(q));
  }

  return (
    <>
      {/* Filter indicator */}
      {hasFilter && (
        <div className="flex items-center justify-center gap-3 text-sm text-gray-500 mb-6">
          <span>
            Filter: <span className="font-medium text-gray-700">{teamFilter}</span>
          </span>
          <Link href={showAll ? "/standen?alle=true" : "/standen"} className="text-red-500 hover:text-red-700 underline">
            Wis filter
          </Link>
        </div>
      )}

      {matches.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-gray-400 text-lg">
            {showAll ? "Geen wedstrijden gevonden" : "Geen wedstrijden vandaag"}
          </p>
          {!showAll && (
            <Link
              href="/standen?alle=true"
              className="text-sm text-dia-green hover:text-green-700 underline"
            >
              Alle wedstrijden bekijken
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => {
            const items = matches.filter(group.filter);
            if (items.length === 0) return null;
            return (
              <section key={group.key}>
                <div className="flex items-center justify-center gap-2 mb-3">
                  <span className={`w-2.5 h-2.5 rounded-full ${group.dotClass}`} />
                  <h2 className={`text-xs font-bold uppercase tracking-widest ${group.labelClass}`}>
                    {group.label}
                  </h2>
                </div>
                <div className="divide-y divide-gray-100">
                  {items.map((m) => (
                    <ScoreRow key={m._id} match={m} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Toggle link */}
      <div className="text-center mt-8">
        {showAll ? (
          <Link href="/standen" className="text-sm text-dia-green hover:text-green-700">
            Alleen vandaag
          </Link>
        ) : (
          <Link href="/standen?alle=true" className="text-sm text-gray-400 hover:text-gray-600">
            Alle wedstrijden
          </Link>
        )}
      </div>
    </>
  );
}

export default function StandenPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-8">
          DIA Live <span className="text-dia-green">Standen</span>
        </h1>

        <Suspense fallback={<p className="text-center text-gray-400 py-16 text-lg">Laden...</p>}>
          <StandenContent />
        </Suspense>

        <div className="text-center mt-12">
          <Link href="/" className="text-sm text-gray-400 hover:text-dia-green transition-colors">
            ← Terug naar home
          </Link>
        </div>
      </div>
    </main>
  );
}
