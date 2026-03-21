"use client";

import Link from "next/link";
import { useQuery, useConvexConnectionState } from "convex/react";
import { api } from "@/convex/_generated/api";
import clsx from "clsx";
import { useEffect, useState } from "react";
import type { PublicMatch } from "@/types/publicMatch";
import { formatMatchDate } from "@/types/publicMatch";
import { filterMatchesForBrowser } from "@/lib/matchBrowserFilters";
import { TeamLogo } from "@/components/TeamLogo";
import { resolveLogoUrl } from "@/lib/logos";

const statusGroups = [
  {
    key: "live" as const,
    label: "LIVE",
    filter: (m: PublicMatch) => m.status === "live" || m.status === "halftime",
    dotClass: "bg-green-500 animate-pulse",
    labelClass: "text-green-600",
  },
  {
    key: "scheduled" as const,
    label: "Gepland",
    filter: (m: PublicMatch) => m.status === "scheduled",
    dotClass: "bg-blue-500",
    labelClass: "text-blue-700",
  },
  {
    key: "finished" as const,
    label: "Afgelopen",
    filter: (m: PublicMatch) => m.status === "finished",
    dotClass: "bg-red-500",
    labelClass: "text-red-600",
  },
];

function MatchCard({ match }: { match: PublicMatch }) {
  const isLive = match.status === "live" || match.status === "halftime";
  const showScore = match.status !== "scheduled";
  const diaLogo = resolveLogoUrl(match.teamLogoUrl, match.clubLogoUrl);

  const homeName = match.isHome ? match.teamName : match.opponent;
  const awayName = match.isHome ? match.opponent : match.teamName;
  const homeLogo = match.isHome ? diaLogo : (match.opponentLogoUrl ?? null);
  const awayLogo = match.isHome ? (match.opponentLogoUrl ?? null) : diaLogo;

  return (
    <Link
      href={`/live/${match.publicCode}`}
      className={clsx(
        "flex flex-col items-center rounded-xl border bg-white px-3 py-4 gap-2",
        "transition-all active:scale-[0.98] touch-manipulation",
        isLive
          ? "border-green-200 shadow-md hover:shadow-lg"
          : "border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300"
      )}
    >
      {/* Home team */}
      <div className="flex items-center gap-2 w-full justify-center min-w-0">
        <TeamLogo logoUrl={homeLogo} teamName={homeName} size="sm" className="flex-shrink-0" />
        <span className="font-semibold text-gray-900 text-sm leading-tight text-center">
          {homeName}
        </span>
      </div>

      {/* Score / status */}
      <div className="flex flex-col items-center">
        {showScore ? (
          <span
            className={clsx(
              "text-2xl font-bold tabular-nums",
              isLive ? "text-green-600" : "text-gray-800"
            )}
          >
            {match.homeScore} - {match.awayScore}
          </span>
        ) : (
          <span className="text-base text-gray-300 font-medium">vs</span>
        )}
        {isLive && (
          <span className="text-xs font-medium text-green-600">
            {match.status === "halftime" ? "Rust" : `K${match.currentQuarter}`}
          </span>
        )}
        {match.status === "scheduled" && match.scheduledAt && (
          <span className="text-xs text-gray-500">
            {formatMatchDate(match.scheduledAt)}
          </span>
        )}
      </div>

      {/* Away team */}
      <div className="flex items-center gap-2 w-full justify-center min-w-0">
        <TeamLogo logoUrl={awayLogo} teamName={awayName} size="sm" className="flex-shrink-0" />
        <span className="font-semibold text-gray-900 text-sm leading-tight text-center">
          {awayName}
        </span>
      </div>
    </Link>
  );
}

export function MatchBrowser() {
  const matches = useQuery(api.matches.listPublicMatches);
  const connection = useConvexConnectionState();
  const [showConnectionIssue, setShowConnectionIssue] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAllWithoutSearch, setShowAllWithoutSearch] = useState(false);

  // If we stay in "loading" (undefined) and the client never connected or keeps retrying, show connection message
  useEffect(() => {
    if (matches !== undefined) {
      setShowConnectionIssue(false);
      return;
    }
    const notConnected =
      !connection.isWebSocketConnected || !connection.hasEverConnected;
    const struggling =
      connection.connectionRetries > 2;
    const t = setTimeout(
      () => setShowConnectionIssue(notConnected || struggling),
      4000
    );
    return () => clearTimeout(t);
  }, [matches, connection.isWebSocketConnected, connection.hasEverConnected, connection.connectionRetries]);

  // Loading state
  if (matches === undefined) {
    return (
      <div className="mt-8">
        <Divider />
        {showConnectionIssue ? (
          <p className="text-center text-amber-600 py-8 text-sm">
            Geen verbinding met de server. Controleer je internet of probeer
            later opnieuw.
          </p>
        ) : (
          <p className="text-center text-gray-400 py-8 text-sm">Laden...</p>
        )}
      </div>
    );
  }

  // Empty state
  const filteredMatches = filterMatchesForBrowser(
    matches,
    searchTerm,
    showAllWithoutSearch
  );
  const normalizedSearch = searchTerm.trim();
  const showWeekendEmptyState = !normalizedSearch && !showAllWithoutSearch;
  const hasMatches = filteredMatches.length > 0;

  return (
    <div className="mt-8">
      <Divider />

      <div className="mb-4">
        <div className="flex gap-2">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
            }}
            placeholder="Zoek op team..."
            className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-dia-green focus:outline-none"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="min-h-[44px] rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              aria-label="Zoekveld wissen"
            >
              Wis
            </button>
          )}
        </div>
        {!normalizedSearch && !showAllWithoutSearch && (
          <p className="mt-2 text-xs text-gray-500">
            Je ziet nu alleen live en wedstrijden van komend weekend.
          </p>
        )}
        {!normalizedSearch && showAllWithoutSearch && (
          <button
            type="button"
            onClick={() => setShowAllWithoutSearch(false)}
            className="mt-2 min-h-[44px] text-xs font-medium text-dia-green hover:text-green-700"
          >
            Terug naar komend weekend
          </button>
        )}
      </div>

      {hasMatches ? (
        <div className="space-y-5">
          {statusGroups.map((group) => {
            const groupMatches = filteredMatches.filter(group.filter);
            if (groupMatches.length === 0) return null;

            return (
              <section key={group.key}>
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={clsx("w-2 h-2 rounded-full", group.dotClass)}
                  />
                  <h3
                    className={clsx(
                      "text-sm font-bold uppercase tracking-wide",
                      group.labelClass
                    )}
                  >
                    {group.label}
                  </h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {groupMatches.map((match) => (
                    <MatchCard key={match._id} match={match as PublicMatch} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3 py-8 text-center" aria-live="polite">
          <p className="text-sm text-gray-500">
            {normalizedSearch
              ? `Geen wedstrijden gevonden voor "${normalizedSearch}"`
              : "Geen wedstrijden dit weekend"}
          </p>
          {normalizedSearch ? (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="min-h-[44px] text-sm font-medium text-dia-green hover:text-green-700 transition-colors"
            >
              Wis zoekopdracht
            </button>
          ) : null}
          {showWeekendEmptyState && (
            <button
              type="button"
              onClick={() => setShowAllWithoutSearch(true)}
              className="min-h-[44px] text-sm font-medium text-dia-green hover:text-green-700 transition-colors"
            >
              Toon alle wedstrijden
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Divider() {
  return (
    <div className="relative mb-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-gray-300" />
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="px-2 bg-gray-50 text-gray-500">
          of kies een wedstrijd
        </span>
      </div>
    </div>
  );
}
