"use client";

import { useQuery, useConvexConnectionState } from "convex/react";
import { api } from "@/convex/_generated/api";
import clsx from "clsx";
import { useEffect, useState } from "react";
import type { PublicMatch } from "@/types/publicMatch";
import {
  filterMatchesForBrowser,
  type TimeFilter,
  type VenueFilter,
} from "@/lib/matchBrowserFilters";
import { MatchBrowserCard } from "@/components/MatchBrowserCard";

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

const TIME_FILTER_LABELS: Record<TimeFilter, string> = {
  weekend: "Komend weekend",
  today: "Vandaag",
  week: "Deze week",
  all: "Alle wedstrijden",
};

const TIME_FILTER_HELP: Record<TimeFilter, string> = {
  weekend:
    "Live wedstrijden plus geplande en afgelopen wedstrijden in het komende weekendvenster (vrij–zon).",
  today: "Live wedstrijden plus wedstrijden met een aanvang vandaag (lokale tijd).",
  week: "Live wedstrijden plus wedstrijden in de huidige kalenderweek (ma–zo).",
  all: "Alle zichtbare wedstrijden in de app.",
};

const VENUE_FILTER_LABELS: Record<VenueFilter, string> = {
  all: "Thuis én uit",
  home: "Alleen thuis",
  away: "Alleen uit",
};

function sortMatchesInGroup(
  matches: PublicMatch[],
  groupKey: (typeof statusGroups)[number]["key"]
): PublicMatch[] {
  const copy = [...matches];
  if (groupKey === "scheduled") {
    return copy.sort((a, b) => (a.scheduledAt ?? Infinity) - (b.scheduledAt ?? Infinity));
  }
  if (groupKey === "finished") {
    return copy.sort((a, b) => (b.scheduledAt ?? 0) - (a.scheduledAt ?? 0));
  }
  return copy.sort((a, b) => (a.scheduledAt ?? 0) - (b.scheduledAt ?? 0));
}

export function MatchBrowser() {
  const matches = useQuery(api.matches.listPublicMatches);
  const connection = useConvexConnectionState();
  const [showConnectionIssue, setShowConnectionIssue] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("weekend");
  const [venueFilter, setVenueFilter] = useState<VenueFilter>("all");

  useEffect(() => {
    if (matches !== undefined) {
      setShowConnectionIssue(false);
      return;
    }
    const notConnected =
      !connection.isWebSocketConnected || !connection.hasEverConnected;
    const struggling = connection.connectionRetries > 2;
    const t = setTimeout(
      () => setShowConnectionIssue(notConnected || struggling),
      4000
    );
    return () => clearTimeout(t);
  }, [
    matches,
    connection.isWebSocketConnected,
    connection.hasEverConnected,
    connection.connectionRetries,
  ]);

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

  const filteredMatches = filterMatchesForBrowser(
    matches,
    searchTerm,
    timeFilter,
    venueFilter
  );
  const normalizedSearch = searchTerm.trim();
  const hasMatches = filteredMatches.length > 0;
  const showWeekendEmptyCta =
    !normalizedSearch && !hasMatches && timeFilter === "weekend";

  const emptyTitle = normalizedSearch
    ? `Geen wedstrijden gevonden voor "${normalizedSearch}"`
    : venueFilter === "home"
      ? "Geen thuiswedstrijden voor deze filters"
      : venueFilter === "away"
        ? "Geen uitwedstrijden voor deze filters"
        : timeFilter === "today"
          ? "Geen wedstrijden vandaag"
          : timeFilter === "week"
            ? "Geen wedstrijden in deze week"
            : timeFilter === "all"
              ? "Geen wedstrijden"
              : "Geen wedstrijden in deze periode (komend weekend)";

  return (
    <div className="mt-8">
      <Divider />

      <div className="mb-4 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
            }}
            placeholder="Filter op teamnaam…"
            className="min-h-[44px] flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-dia-green focus:outline-none sm:min-w-[12rem]"
            aria-label="Filter op teamnaam"
          />
          <select
            value={timeFilter}
            onChange={(event) =>
              setTimeFilter(event.target.value as TimeFilter)
            }
            className="min-h-[44px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-dia-green focus:outline-none sm:min-w-[13rem] sm:w-auto"
            aria-label="Filter op tijd"
          >
            {(Object.keys(TIME_FILTER_LABELS) as TimeFilter[]).map((key) => (
              <option key={key} value={key}>
                {TIME_FILTER_LABELS[key]}
              </option>
            ))}
          </select>
          <select
            value={venueFilter}
            onChange={(event) =>
              setVenueFilter(event.target.value as VenueFilter)
            }
            className="min-h-[44px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-dia-green focus:outline-none sm:min-w-[11rem] sm:w-auto"
            aria-label="Filter thuis of uit"
          >
            {(Object.keys(VENUE_FILTER_LABELS) as VenueFilter[]).map((key) => (
              <option key={key} value={key}>
                {VENUE_FILTER_LABELS[key]}
              </option>
            ))}
          </select>
          {(searchTerm || timeFilter !== "weekend" || venueFilter !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setTimeFilter("weekend");
                setVenueFilter("all");
              }}
              className="min-h-[44px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 sm:w-auto"
            >
              Reset filters
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          {TIME_FILTER_HELP[timeFilter]}
          {venueFilter !== "all" ? (
            <>
              {" "}
              {venueFilter === "home"
                ? "Alleen wedstrijden waarbij het clubteam thuis speelt."
                : "Alleen wedstrijden waarbij het clubteam uit speelt."}
            </>
          ) : null}
        </p>
      </div>

      {hasMatches ? (
        <div className="space-y-6">
          {statusGroups.map((group) => {
            const groupMatches = sortMatchesInGroup(
              filteredMatches.filter(group.filter),
              group.key
            );
            if (groupMatches.length === 0) return null;

            return (
              <section key={group.key}>
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={clsx("w-2 h-2 rounded-full shrink-0", group.dotClass)}
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
                <ul className="flex flex-col gap-3" role="list">
                  {groupMatches.map((match) => (
                    <li key={match._id} className="w-full">
                      <MatchBrowserCard match={match as PublicMatch} />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3 py-8 text-center" aria-live="polite">
          <p className="text-sm text-gray-500">{emptyTitle}</p>
          {normalizedSearch ? (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="min-h-[44px] text-sm font-medium text-dia-green hover:text-green-700 transition-colors"
            >
              Wis zoekopdracht
            </button>
          ) : null}
          {showWeekendEmptyCta && (
            <button
              type="button"
              onClick={() => setTimeFilter("all")}
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
