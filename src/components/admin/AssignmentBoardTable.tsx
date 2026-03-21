"use client";

import clsx from "clsx";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { formatMatchDate } from "@/types/publicMatch";
import type { AssignmentBoardMatch } from "./types";
import { MatchVersusLogos } from "@/components/MatchVersusLogos";

const statusBadges: Record<
  AssignmentBoardMatch["status"],
  { label: string; className: string }
> = {
  scheduled: { label: "Gepland", className: "bg-blue-100 text-blue-700" },
  lineup: { label: "Opstelling", className: "bg-sky-100 text-sky-700" },
  live: { label: "LIVE", className: "bg-emerald-100 text-emerald-700" },
  halftime: { label: "Rust", className: "bg-amber-100 text-amber-700" },
  finished: { label: "Afgelopen", className: "bg-slate-200 text-slate-700" },
};

const qualificationBadges = {
  geschikt: "bg-emerald-100 text-emerald-700",
  mogelijk: "bg-amber-100 text-amber-700",
  onbekend: "bg-slate-200 text-slate-600",
};

function getMatchLabel(match: AssignmentBoardMatch) {
  return match.isHome
    ? `${match.teamName} vs ${match.opponent}`
    : `${match.teamName} @ ${match.opponent}`;
}

function getScoreLabel(match: AssignmentBoardMatch) {
  if (match.status === "scheduled") {
    return "-";
  }

  return `${match.homeScore} - ${match.awayScore}`;
}

export function AssignmentBoardTable({
  matches,
  selectedMatchId,
  onSelect,
}: {
  matches: AssignmentBoardMatch[];
  selectedMatchId: AssignmentBoardMatch["_id"] | null;
  onSelect: (matchId: AssignmentBoardMatch["_id"]) => void;
}) {
  if (matches.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white/80 px-6 py-14 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-500">Geen wedstrijden in deze selectie.</p>
        <p className="mt-2 text-sm text-slate-400">
          Pas je filters aan of maak een nieuwe wedstrijd aan.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_16px_40px_rgba(15,23,42,0.08)]">
      <div className="overflow-x-auto">
        <table className="min-w-[1040px] w-full border-separate border-spacing-0 text-left text-sm text-slate-700">
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-[0.18em] text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Datum/tijd</th>
              <th className="px-4 py-3 font-semibold">Wedstrijd</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Coach</th>
              <th className="px-4 py-3 font-semibold">Scheidsrechter</th>
              <th className="px-4 py-3 font-semibold">Kwalificatie</th>
              <th className="px-4 py-3 font-semibold">Code</th>
              <th className="px-4 py-3 font-semibold text-right">Score</th>
              <th className="px-4 py-3 font-semibold" aria-hidden="true" />
            </tr>
          </thead>
          <tbody>
            {matches.map((match) => {
              const badge = statusBadges[match.status];
              const isSelected = match._id === selectedMatchId;
              const refereeMissing = !match.refereeName;

              return (
                <tr
                  key={match._id}
                  className={clsx(
                    "cursor-pointer transition-colors hover:bg-emerald-50/70",
                    isSelected && "bg-emerald-50/80"
                  )}
                  onClick={() => onSelect(match._id)}
                  aria-selected={isSelected}
                >
                  <td className="border-t border-slate-100 px-4 py-3 whitespace-nowrap text-slate-500">
                    {match.scheduledAt ? formatMatchDate(match.scheduledAt) : "Ongepland"}
                  </td>
                  <td className="border-t border-slate-100 px-4 py-3">
                    <div className="mb-2 flex justify-start">
                      <MatchVersusLogos
                        isHome={match.isHome}
                        teamName={match.teamName}
                        opponent={match.opponent}
                        teamLogoUrl={match.teamLogoUrl}
                        clubLogoUrl={match.clubLogoUrl}
                        opponentLogoUrl={match.opponentLogoUrl}
                        size="sm"
                      />
                    </div>
                    <div className="font-semibold text-slate-900">{getMatchLabel(match)}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                      {match.matchQualificationTags.map((tag) => (
                        <span
                          key={`${match._id}-${tag}`}
                          className="rounded-full bg-slate-100 px-2 py-0.5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="border-t border-slate-100 px-4 py-3">
                    <span className={clsx("rounded-full px-2.5 py-1 text-xs font-semibold", badge.className)}>
                      {badge.label}
                    </span>
                  </td>
                  <td className="border-t border-slate-100 px-4 py-3 text-slate-600">
                    {match.coachName ?? "Nog geen coach"}
                  </td>
                  <td className="border-t border-slate-100 px-4 py-3">
                    {refereeMissing ? (
                      <span className="inline-flex items-center gap-1 text-amber-700">
                        <AlertTriangle size={14} />
                        Nog niet toegewezen
                      </span>
                    ) : (
                      <span className="text-slate-700">{match.refereeName}</span>
                    )}
                  </td>
                  <td className="border-t border-slate-100 px-4 py-3">
                    <span
                      className={clsx(
                        "rounded-full px-2.5 py-1 text-xs font-semibold",
                        qualificationBadges[match.qualificationState]
                      )}
                    >
                      {match.qualificationState}
                    </span>
                  </td>
                  <td className="border-t border-slate-100 px-4 py-3">
                    <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600">
                      {match.publicCode}
                    </span>
                  </td>
                  <td className="border-t border-slate-100 px-4 py-3 text-right font-semibold tabular-nums text-slate-900">
                    {getScoreLabel(match)}
                  </td>
                  <td className="border-t border-slate-100 px-4 py-3 text-right text-slate-400">
                    <ChevronRight size={16} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
