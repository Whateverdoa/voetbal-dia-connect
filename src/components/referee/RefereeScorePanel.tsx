"use client";

import { ScoreColumn } from "./RefereeScorePrompts";

type RefereeScorePanelProps = {
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
  isLoading: boolean;
  scoreError: string | null;
  onIncrement: (team: "home" | "away") => void;
  onDecrement: (team: "home" | "away") => Promise<void>;
};

export function RefereeScorePanel({
  homeName,
  awayName,
  homeScore,
  awayScore,
  isLoading,
  scoreError,
  onIncrement,
  onDecrement,
}: RefereeScorePanelProps) {
  return (
    <div className="space-y-2.5">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-500">
        Score aanpassen
      </h2>

      {scoreError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
          {scoreError}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <ScoreColumn
          teamName={homeName}
          score={homeScore}
          team="home"
          isLoading={isLoading}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
          showScore={false}
        />
        <ScoreColumn
          teamName={awayName}
          score={awayScore}
          team="away"
          isLoading={isLoading}
          onIncrement={onIncrement}
          onDecrement={onDecrement}
          showScore={false}
        />
      </div>
    </div>
  );
}
