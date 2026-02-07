"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import clsx from "clsx";
import { Trophy, TrendingUp } from "lucide-react";
import { StatCard } from "./StatCard";

interface SeasonSummaryProps {
  teamId: string;
}

export function SeasonSummary({ teamId }: SeasonSummaryProps) {
  const stats = useQuery(api.teams.getSeasonStats, { teamId: teamId as any });

  if (!stats) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (stats.matchesPlayed === 0) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm text-center text-gray-500">
        <p>Nog geen wedstrijden gespeeld dit seizoen</p>
      </div>
    );
  }

  return (
    <section className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="bg-dia-green-light px-4 py-3">
        <h2 className="text-white font-semibold flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Seizoen Overzicht
        </h2>
      </div>

      <div className="p-4 space-y-4">
        {/* Record */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <StatCard
            label="Gespeeld"
            value={stats.matchesPlayed}
            color="gray"
          />
          <StatCard
            label="Gewonnen"
            value={stats.wins}
            color="green"
          />
          <StatCard
            label="Gelijk"
            value={stats.draws}
            color="gray"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 text-center">
          <StatCard
            label="Verloren"
            value={stats.losses}
            color="red"
          />
          <StatCard
            label="Doelsaldo"
            value={`${stats.goalsFor} - ${stats.goalsAgainst}`}
            color="blue"
            subtitle={`${stats.goalsFor > stats.goalsAgainst ? "+" : ""}${stats.goalsFor - stats.goalsAgainst}`}
          />
        </div>

        {/* Top Scorers */}
        {stats.topScorers.length > 0 && (
          <TopScorers scorers={stats.topScorers} />
        )}
      </div>
    </section>
  );
}

interface Scorer {
  playerId: string;
  name: string;
  goals: number;
}

function TopScorers({ scorers }: { scorers: Scorer[] }) {
  return (
    <div className="pt-3 border-t border-gray-100">
      <h3 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-1">
        <Trophy className="w-4 h-4 text-yellow-500" />
        Topscorers
      </h3>
      <div className="space-y-1">
        {scorers.map((scorer, i) => (
          <div
            key={scorer.playerId}
            className="flex items-center justify-between text-sm"
          >
            <span className="flex items-center gap-2">
              <span
                className={clsx(
                  "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold",
                  i === 0 && "bg-yellow-400 text-yellow-900",
                  i === 1 && "bg-gray-300 text-gray-700",
                  i === 2 && "bg-orange-300 text-orange-800"
                )}
              >
                {i + 1}
              </span>
              {scorer.name}
            </span>
            <span className="font-semibold">
              {scorer.goals} {scorer.goals === 1 ? "goal" : "goals"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
