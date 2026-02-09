"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface RefereeScoreControlsProps {
  matchId: Id<"matches">;
  pin: string;
  homeScore: number;
  awayScore: number;
  homeName: string;
  awayName: string;
}

type PendingTeam = "home" | "away" | null;

export function RefereeScoreControls({
  matchId,
  pin,
  homeScore,
  awayScore,
  homeName,
  awayName,
}: RefereeScoreControlsProps) {
  const adjustScore = useMutation(api.matchActions.adjustScore);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for the optional shirt number prompt
  const [pendingTeam, setPendingTeam] = useState<PendingTeam>(null);
  const [shirtNumber, setShirtNumber] = useState("");

  const handleError = (err: unknown) => {
    const msg = err instanceof Error ? err.message : "Onbekende fout";
    setError(msg.includes("Invalid match or PIN") ? "PIN niet geldig" : `Fout: ${msg}`);
    setTimeout(() => setError(null), 5000);
  };

  /** Decrement: immediate, no prompt */
  const handleDecrement = async (team: "home" | "away") => {
    setIsLoading(true);
    setError(null);
    try {
      await adjustScore({ matchId, pin, team, delta: -1 });
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  /** Increment: open the optional shirt number prompt */
  const handleIncrementStart = (team: "home" | "away") => {
    setPendingTeam(team);
    setShirtNumber("");
  };

  /** Confirm increment with optional shirt number */
  const handleIncrementConfirm = async (skip: boolean) => {
    if (!pendingTeam) return;
    setIsLoading(true);
    setError(null);
    try {
      const parsedNumber = skip ? undefined : parseInt(shirtNumber, 10);
      const scorerNumber =
        parsedNumber != null && !isNaN(parsedNumber) && parsedNumber > 0
          ? parsedNumber
          : undefined;

      await adjustScore({
        matchId,
        pin,
        team: pendingTeam,
        delta: 1,
        scorerNumber,
      });
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
      setPendingTeam(null);
      setShirtNumber("");
    }
  };

  const handleCancel = () => {
    setPendingTeam(null);
    setShirtNumber("");
  };

  return (
    <section className="bg-white rounded-xl shadow-md p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide text-center">
        Score aanpassen
      </h2>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Score columns */}
      <div className="grid grid-cols-2 gap-3">
        <ScoreColumn
          teamName={homeName}
          score={homeScore}
          team="home"
          isLoading={isLoading}
          onIncrement={handleIncrementStart}
          onDecrement={handleDecrement}
        />
        <ScoreColumn
          teamName={awayName}
          score={awayScore}
          team="away"
          isLoading={isLoading}
          onIncrement={handleIncrementStart}
          onDecrement={handleDecrement}
        />
      </div>

      {/* Shirt number prompt overlay */}
      {pendingTeam && (
        <ShirtNumberPrompt
          teamName={pendingTeam === "home" ? homeName : awayName}
          shirtNumber={shirtNumber}
          onShirtNumberChange={setShirtNumber}
          onConfirm={() => handleIncrementConfirm(false)}
          onSkip={() => handleIncrementConfirm(true)}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      )}
    </section>
  );
}

/** Single team score column with +/- buttons */
function ScoreColumn({
  teamName,
  score,
  team,
  isLoading,
  onIncrement,
  onDecrement,
}: {
  teamName: string;
  score: number;
  team: "home" | "away";
  isLoading: boolean;
  onIncrement: (team: "home" | "away") => void;
  onDecrement: (team: "home" | "away") => Promise<void>;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-xs font-medium text-gray-500 truncate max-w-full">
        {teamName}
      </span>
      <span className="text-3xl font-bold tabular-nums">{score}</span>
      <div className="flex gap-2 w-full">
        <button
          onClick={() => onDecrement(team)}
          disabled={isLoading || score === 0}
          className="flex-1 py-3 bg-gray-200 text-gray-700 text-xl font-bold rounded-lg
                     min-h-[48px] active:scale-[0.96] transition-transform
                     hover:bg-gray-300 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label={`${teamName} score -1`}
        >
          −
        </button>
        <button
          onClick={() => onIncrement(team)}
          disabled={isLoading}
          className="flex-1 py-3 bg-dia-green text-white text-xl font-bold rounded-lg
                     min-h-[48px] active:scale-[0.96] transition-transform
                     hover:bg-dia-green-light disabled:opacity-50"
          aria-label={`${teamName} score +1`}
        >
          +
        </button>
      </div>
    </div>
  );
}

/** Inline prompt for optional shirt number entry */
function ShirtNumberPrompt({
  teamName,
  shirtNumber,
  onShirtNumberChange,
  onConfirm,
  onSkip,
  onCancel,
  isLoading,
}: {
  teamName: string;
  shirtNumber: string;
  onShirtNumberChange: (val: string) => void;
  onConfirm: () => void;
  onSkip: () => void;
  onCancel: () => void;
  isLoading: boolean;
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
          {isLoading ? "Bezig..." : "Sla over"}
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading || !shirtNumber}
          className="flex-1 py-3 bg-dia-green text-white text-sm font-medium
                     rounded-lg hover:bg-dia-green-light disabled:opacity-50"
        >
          {isLoading ? "Bezig..." : "Opslaan"}
        </button>
      </div>
    </div>
  );
}
