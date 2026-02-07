"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import type { MatchStatus } from "./types";

interface MatchControlsProps {
  matchId: Id<"matches">;
  pin: string;
  status: MatchStatus;
  currentQuarter: number;
  quarterCount: number;
  homeScore: number;
  awayScore: number;
  onGoalClick: () => void;
  onSubClick: () => void;
}

export function MatchControls({
  matchId,
  pin,
  status,
  currentQuarter,
  quarterCount,
  homeScore,
  awayScore,
  onGoalClick,
  onSubClick,
}: MatchControlsProps) {
  const startMatch = useMutation(api.matchActions.start);
  const nextQuarter = useMutation(api.matchActions.nextQuarter);
  const resumeHalftime = useMutation(api.matchActions.resumeFromHalftime);
  const removeLastGoal = useMutation(api.matchActions.removeLastGoal);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undoConfirm, setUndoConfirm] = useState(false);

  // Auto-cancel undo confirmation after 5s to prevent accidental taps
  useEffect(() => {
    if (!undoConfirm) return;
    const timer = setTimeout(() => setUndoConfirm(false), 5000);
    return () => clearTimeout(timer);
  }, [undoConfirm]);

  const totalGoals = homeScore + awayScore;

  const handleMutation = async (action: () => Promise<unknown>, actionName: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      console.error(`${actionName} failed:`, err);
      const message = err instanceof Error ? err.message : "Onbekende fout";
      // Check for PIN errors
      if (message.includes("Invalid match or PIN")) {
        setError("Sessie verlopen. Herlaad de pagina.");
      } else {
        setError(`Fout: ${message}`);
      }
      // Auto-clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const isLive = status === "live";
  const isHalftime = status === "halftime";
  const isFinished = status === "finished";
  const isScheduled = status === "scheduled" || status === "lineup";

  // Label for the resume button during rest periods
  const getResumeLabel = () => {
    if (quarterCount === 2) {
      return `Start helft ${currentQuarter}`;
    }
    return `Start kwart ${currentQuarter}`;
  };

  const getNextQuarterLabel = () => {
    if (currentQuarter >= quarterCount) {
      return "Einde wedstrijd";
    }
    if (quarterCount === 2) {
      return `Einde helft ${currentQuarter}`;
    }
    return `Einde kwart ${currentQuarter}`;
  };

  return (
    <section className="bg-white rounded-xl shadow-md p-4">
      {/* Error message */}
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Pre-match: Start button */}
      {isScheduled && (
        <button
          onClick={() => handleMutation(() => startMatch({ matchId, pin }), "Start wedstrijd")}
          disabled={isLoading}
          className="w-full py-4 bg-dia-green text-white text-xl font-bold rounded-xl 
                     min-h-[56px] active:scale-[0.98] transition-transform
                     hover:bg-dia-green-light shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Bezig..." : "Start wedstrijd"}
        </button>
      )}

      {/* Live: Goal, Sub, Next quarter buttons */}
      {isLive && (
        <div className="space-y-3">
          {/* Primary actions: Goal buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onGoalClick}
              disabled={isLoading}
              className="py-5 bg-dia-green text-white text-xl font-bold rounded-xl 
                         min-h-[64px] active:scale-[0.98] transition-transform
                         hover:bg-dia-green-light shadow-lg flex items-center justify-center gap-2
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-2xl">⚽</span>
              <span>GOAL!</span>
            </button>
            <button
              onClick={onSubClick}
              disabled={isLoading}
              className="py-5 bg-blue-600 text-white text-xl font-bold rounded-xl 
                         min-h-[64px] active:scale-[0.98] transition-transform
                         hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="text-2xl">🔄</span>
              <span>Wissel</span>
            </button>
          </div>

          {/* Secondary: Quarter control */}
          <button
            onClick={() => handleMutation(() => nextQuarter({ matchId, pin }), "Volgende kwart")}
            disabled={isLoading}
            className="w-full py-3 border-2 border-gray-300 text-gray-700 font-semibold 
                       rounded-xl min-h-[48px] active:scale-[0.98] transition-transform
                       hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Bezig..." : getNextQuarterLabel()}
          </button>

          {/* Undo last goal — visible when goals exist */}
          {totalGoals > 0 && (
            <UndoGoalButton
              isConfirming={undoConfirm}
              isLoading={isLoading}
              onFirstTap={() => setUndoConfirm(true)}
              onConfirm={() => {
                setUndoConfirm(false);
                handleMutation(
                  () => removeLastGoal({ matchId, pin }),
                  "Doelpunt ongedaan maken"
                );
              }}
              onCancel={() => setUndoConfirm(false)}
            />
          )}
        </div>
      )}

      {/* Rest period: Resume button (universal — all inter-quarter breaks) */}
      {isHalftime && (
        <button
          onClick={() => handleMutation(() => resumeHalftime({ matchId, pin }), "Hervatten")}
          disabled={isLoading}
          className="w-full py-4 bg-dia-green text-white text-xl font-bold rounded-xl 
                     min-h-[56px] active:scale-[0.98] transition-transform
                     hover:bg-dia-green-light shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Bezig..." : getResumeLabel()}
        </button>
      )}

      {/* Finished: Info message */}
      {isFinished && (
        <div className="text-center py-4">
          <p className="text-gray-500 font-medium">Wedstrijd is afgelopen</p>
        </div>
      )}
    </section>
  );
}

/** Two-step undo button: first tap reveals confirm/cancel, second tap executes. */
function UndoGoalButton({
  isConfirming,
  isLoading,
  onFirstTap,
  onConfirm,
  onCancel,
}: {
  isConfirming: boolean;
  isLoading: boolean;
  onFirstTap: () => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (isConfirming) {
    return (
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 py-2 border-2 border-gray-300 text-gray-600 font-semibold 
                     rounded-xl min-h-[44px] active:scale-[0.98] transition-transform
                     disabled:opacity-50"
        >
          Annuleren
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 py-2 bg-red-600 text-white font-semibold 
                     rounded-xl min-h-[44px] active:scale-[0.98] transition-transform
                     disabled:opacity-50"
        >
          {isLoading ? "Bezig..." : "Ja, verwijder"}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onFirstTap}
      disabled={isLoading}
      className="w-full py-2 text-red-600 border-2 border-red-200 font-medium 
                 rounded-xl min-h-[44px] active:scale-[0.98] transition-transform
                 hover:bg-red-50 hover:border-red-300 disabled:opacity-50 text-sm"
    >
      Laatste doelpunt ongedaan maken
    </button>
  );
}
