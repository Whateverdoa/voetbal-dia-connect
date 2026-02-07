"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Target } from "lucide-react";
import { HistoryMatchCard } from "./HistoryMatchCard";

interface MatchListProps {
  teamId: string;
}

export function MatchList({ teamId }: MatchListProps) {
  const matches = useQuery(api.teams.getMatchHistory, { teamId: teamId as any });

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
      <h2 className="text-lg font-semibold text-gray-900">
        Wedstrijden ({matches.length})
      </h2>
      {matches.map((match) => (
        <HistoryMatchCard key={match.id} match={match} />
      ))}
    </section>
  );
}
