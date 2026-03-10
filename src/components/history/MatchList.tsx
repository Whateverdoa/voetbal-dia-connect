"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Target } from "lucide-react";
import { HistoryMatchCard } from "./HistoryMatchCard";

interface MatchListProps {
  teamId: string;
}

export function MatchList({ teamId }: MatchListProps) {
  const [coachPin, setCoachPin] = useState("");
  const normalizedPin = coachPin.trim() || undefined;
  const matches = useQuery(api.teams.getMatchHistory, { teamId: teamId as any });
  const canEditHistory = useQuery(api.historyActions.canEditTeamHistory, {
    teamId: teamId as any,
    pin: normalizedPin,
  });

  if (!matches) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-gray-900">Wedstrijden</h2>
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-1/2 mb-2" />
            <div className="h-4 bg-gray-100 rounded w-1/3" />
          </div>
        ))}
      </section>
    );
  }

  if (matches.length === 0) {
    return (
      <section className="text-center py-8 text-gray-500">
        <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Nog geen afgelopen wedstrijden</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-gray-900">
          Wedstrijden ({matches.length})
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white p-3 space-y-2">
          <p className="text-sm font-medium text-gray-700">
            Coach-bewerken (optioneel)
          </p>
          <div className="flex items-center gap-2">
            <input
              value={coachPin}
              onChange={(event) => setCoachPin(event.target.value)}
              type="password"
              inputMode="numeric"
              placeholder="Coach PIN"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            {canEditHistory && (
              <span className="text-xs px-2 py-1 rounded-full bg-dia-green/10 text-dia-green">
                Bewerken actief
              </span>
            )}
          </div>
          {!canEditHistory && (
            <p className="text-xs text-gray-500">
              Zonder coach-auth zie je alleen de historie in read-only.
            </p>
          )}
        </div>
      </div>
      {matches.map((match) => (
        <HistoryMatchCard
          key={match.id}
          match={match}
          canEdit={!!canEditHistory}
          coachPin={normalizedPin}
        />
      ))}
    </section>
  );
}
