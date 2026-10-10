"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { activeSeasonKey } from "@/lib/season";

interface TeamSeasonMinutesPanelProps {
  teamId: Id<"teams">;
}

/** Season playing-time overview for coaches (least minutes first). */
export function TeamSeasonMinutesPanel({ teamId }: TeamSeasonMinutesPanelProps) {
  const seasonKey = activeSeasonKey();
  const data = useQuery(api.playingTimeSeason.getTeamSeasonPlayingTime, {
    teamId,
    seasonKey,
  });

  if (data === undefined) {
    return (
      <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
        <p className="text-sm text-gray-500">Seizoensminuten laden…</p>
      </section>
    );
  }

  if (data === null) {
    return null;
  }

  const { players } = data;
  const withMinutes = players.filter((p) => p.matchesPlayed > 0);
  const average =
    withMinutes.length > 0
      ? Math.round(
          withMinutes.reduce((sum, p) => sum + p.totalMinutes, 0) /
            withMinutes.length
        )
      : 0;
  const maxMinutes =
    players.length > 0
      ? Math.max(...players.map((p) => p.totalMinutes), 1)
      : 1;

  return (
    <section className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm space-y-3">
      <div>
        <h2 className="font-bold text-lg text-gray-900">Speelminuten seizoen</h2>
        <p className="text-sm text-gray-600">
          Seizoen {data.seasonKey} · minst gespeeld eerst
          {withMinutes.length > 0 ? ` · gemiddelde ${average} min` : ""}
        </p>
      </div>

      {players.length === 0 ? (
        <p className="text-sm text-gray-500">Geen actieve spelers.</p>
      ) : withMinutes.length === 0 ? (
        <p className="text-sm text-gray-500">
          Nog geen afgeronde wedstrijden met speeltijd dit seizoen.
        </p>
      ) : (
        <ul className="space-y-2">
          {players.map((player) => {
            const pct = Math.round((player.totalMinutes / maxMinutes) * 100);
            return (
              <li
                key={String(player.playerId)}
                className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-sm font-bold text-gray-700 border border-gray-200">
                    {player.number ?? "–"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-medium text-gray-900">
                        {player.name}
                      </span>
                      <span className="shrink-0 tabular-nums font-bold text-gray-900">
                        {player.totalMinutes} min
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-dia-green"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="shrink-0 text-xs text-gray-500">
                        {player.matchesPlayed} wedstr.
                      </span>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
