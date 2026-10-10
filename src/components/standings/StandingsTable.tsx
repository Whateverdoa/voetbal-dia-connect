"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Trophy } from "lucide-react";
import { StandingsRow } from "./StandingsRow";

interface StandingsTableProps {
  teamSlug: string;
  /** Own team name as we know it, shown in the empty state. */
  teamName: string;
}

/** Bond poule standing for one team, cached from Sportlink. */
export function StandingsTable({ teamSlug, teamName }: StandingsTableProps) {
  const standing = useQuery(api.standings.getByTeamSlug, { teamSlug });

  if (standing === undefined) {
    return (
      <section className="space-y-3">
        <div className="h-5 w-1/2 animate-pulse rounded bg-gray-200" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-11 animate-pulse rounded-lg bg-white shadow-sm"
          />
        ))}
      </section>
    );
  }

  if (standing === null || standing.rows.length === 0) {
    return <NoStanding teamName={teamName} />;
  }

  return (
    <section className="space-y-3">
      <header>
        <h2 className="text-lg font-semibold text-gray-900">Stand</h2>
        <p className="text-sm text-gray-500">{standing.klassepoule}</p>
      </header>

      <div className="overflow-hidden rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
              <th className="py-2 pl-3 pr-1 text-left font-semibold">#</th>
              <th className="py-2 px-1 text-left font-semibold">Team</th>
              <th className="py-2 px-1 text-right font-semibold" title="Gespeeld">
                G
              </th>
              <th
                className="hidden py-2 px-1 text-right font-semibold sm:table-cell"
                title="Winst"
              >
                W
              </th>
              <th
                className="hidden py-2 px-1 text-right font-semibold sm:table-cell"
                title="Gelijk"
              >
                GL
              </th>
              <th
                className="hidden py-2 px-1 text-right font-semibold sm:table-cell"
                title="Verlies"
              >
                V
              </th>
              <th
                className="py-2 px-1 text-right font-semibold"
                title="Doelsaldo"
              >
                DS
              </th>
              <th className="py-2 pl-1 pr-3 text-right font-semibold">Ptn</th>
            </tr>
          </thead>
          <tbody>
            {standing.rows.map((row) => (
              <StandingsRow
                key={`${row.position}-${row.teamName}`}
                row={row}
                isOwnTeam={row.teamName === standing.sportlinkTeamName}
              />
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400">
        Bron: KNVB via Sportlink · bijgewerkt{" "}
        {new Date(standing.fetchedAt).toLocaleDateString("nl-NL", {
          day: "numeric",
          month: "long",
          hour: "2-digit",
          minute: "2-digit",
        })}
      </p>
    </section>
  );
}

function NoStanding({ teamName }: { teamName: string }) {
  return (
    <section className="rounded-xl bg-white p-6 text-center shadow-sm">
      <Trophy className="mx-auto mb-3 h-10 w-10 text-gray-300" />
      <h2 className="font-semibold text-gray-900">Geen stand beschikbaar</h2>
      <p className="mt-1 text-sm text-gray-500">
        De KNVB houdt voor {teamName} geen poulestand bij. Bij de jongste teams
        gaat het om wedstrijdjes zonder ranglijst.
      </p>
    </section>
  );
}
