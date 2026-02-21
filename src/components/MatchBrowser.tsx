"use client";

import Link from "next/link";
import { useQuery, useConvexConnectionState } from "convex/react";
import { api } from "@/convex/_generated/api";
import clsx from "clsx";
import { useEffect, useState } from "react";
import type { PublicMatch } from "@/types/publicMatch";
import { formatMatchDate } from "@/types/publicMatch";

const statusGroups = [
  {
    key: "live" as const,
    label: "Live",
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

function MatchRow({ match }: { match: PublicMatch }) {
  const isLive = match.status === "live" || match.status === "halftime";
  const showScore = match.status !== "scheduled";

  const matchup = match.isHome
    ? `${match.teamName} vs ${match.opponent}`
    : `${match.teamName} @ ${match.opponent}`;

  return (
    <Link
      href={`/live/${match.publicCode}`}
      className={clsx(
        "flex items-center gap-3 rounded-xl border bg-white p-3 min-h-[56px]",
        "transition-all active:scale-[0.98] touch-manipulation",
        isLive
          ? "border-green-200 shadow-md hover:shadow-lg"
          : "border-gray-200 shadow-sm hover:shadow-md hover:border-gray-300"
      )}
    >
      {/* Match info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate text-[15px] leading-tight">
          {matchup}
        </p>
        <div className="flex items-center gap-2 mt-1">
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
          <span className="font-mono text-[11px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
            {match.publicCode}
          </span>
        </div>
      </div>

      {/* Score */}
      <div className="flex-shrink-0 text-right">
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
          <span className="text-lg text-gray-300 font-medium">– – –</span>
        )}
      </div>
    </Link>
  );
}

export function MatchBrowser() {
  const matches = useQuery(api.matches.listPublicMatches);
  const connection = useConvexConnectionState();
  const [showConnectionIssue, setShowConnectionIssue] = useState(false);

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
  if (matches.length === 0) {
    return (
      <div className="mt-8">
        <Divider />
        <p className="text-center text-gray-400 py-8 text-sm">
          Geen wedstrijden gevonden
        </p>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <Divider />

      <div className="space-y-5">
        {statusGroups.map((group) => {
          const groupMatches = matches.filter(group.filter);
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
              <div className="space-y-2">
                {groupMatches.map((match) => (
                  <MatchRow key={match._id} match={match as PublicMatch} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
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
