"use client";

import type { AssistKind } from "@/lib/assistKind";
import { GoalKindChips } from "./GoalKindChips";

export function ShirtNumberPrompt({
  teamName,
  shirtNumber,
  onShirtNumberChange,
  onConfirm,
  onSkip,
  onCancel,
  isLoading,
  goalKind,
  onGoalKindChange,
}: {
  teamName: string;
  shirtNumber: string;
  onShirtNumberChange: (val: string) => void;
  onConfirm: () => void;
  onSkip: () => void;
  onCancel: () => void;
  isLoading: boolean;
  goalKind: AssistKind | null;
  onGoalKindChange: (kind: AssistKind | null) => void;
}) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
      <p className="text-sm font-medium text-gray-700 text-center">
        Doelpunt voor <strong>{teamName}</strong>
      </p>
      <label className="block text-xs text-gray-500 text-center">
        Rugnummer scorer? (optioneel)
      </label>
      <input
        type="number"
        inputMode="numeric"
        pattern="[0-9]*"
        min={1}
        max={99}
        value={shirtNumber}
        onChange={(e) => onShirtNumberChange(e.target.value)}
        placeholder="bijv. 7"
        className="w-full text-center text-2xl font-bold py-3 border-2 border-gray-300
                   rounded-xl focus:border-dia-green focus:outline-none
                   placeholder:text-gray-300 placeholder:font-normal placeholder:text-lg"
        autoFocus
        disabled={isLoading}
      />
      <GoalKindChips
        value={goalKind}
        onChange={onGoalKindChange}
        disabled={isLoading}
      />
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 py-3 border border-gray-300 text-gray-500 text-sm font-medium
                     rounded-lg hover:bg-gray-100 disabled:opacity-50"
        >
          Annuleer
        </button>
        <button
          onClick={onSkip}
          disabled={isLoading}
          className="flex-1 py-3 bg-gray-200 text-gray-700 text-sm font-medium
                     rounded-lg hover:bg-gray-300 disabled:opacity-50"
        >
          {isLoading ? "Bezig..." : "Zonder nummer"}
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 py-3 bg-dia-green text-white text-sm font-medium
                     rounded-lg hover:bg-dia-green-dark disabled:opacity-50"
        >
          {isLoading ? "Bezig..." : "Opslaan"}
        </button>
      </div>
    </div>
  );
}

export function ScoreColumn({
  teamName,
  score,
  team,
  isLoading,
  onIncrement,
  onDecrement,
  showScore = true,
}: {
  teamName: string;
  score: number;
  team: "home" | "away";
  isLoading: boolean;
  onIncrement: (team: "home" | "away") => void;
  onDecrement: (team: "home" | "away") => Promise<void>;
  showScore?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-medium text-gray-500 truncate max-w-full">
        {teamName}
      </span>
      {showScore && <span className="text-3xl font-bold tabular-nums">{score}</span>}
      <div className="flex gap-2 w-full">
        <button
          onClick={() => onDecrement(team)}
          disabled={isLoading || score === 0}
          className="flex-1 py-3 bg-gray-200 text-gray-700 text-xl font-bold rounded-lg
                     min-h-[48px] active:scale-[0.96] transition-transform
                     hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label={`${teamName} score -1`}
        >
          -
        </button>
        <button
          onClick={() => onIncrement(team)}
          disabled={isLoading}
          className="flex-1 py-3 bg-dia-green text-white text-xl font-bold rounded-lg
                     min-h-[48px] active:scale-[0.96] transition-transform
                     hover:bg-dia-green-dark disabled:opacity-50"
          aria-label={`${teamName} score +1`}
        >
          +
        </button>
      </div>
    </div>
  );
}
