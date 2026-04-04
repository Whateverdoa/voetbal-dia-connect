"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import type { MatchStatus } from "./types";
import { createCorrelationId } from "@/lib/correlationId";

interface MatchControlsProps {
  matchId: Id<"matches">;
  status: MatchStatus;
  currentQuarter: number;
  quarterCount: number;
  homeScore: number;
  awayScore: number;
  pausedAt?: number;
  canAddGoals?: boolean;
  canControlClock?: boolean;
  canDoSubstitutions?: boolean;
  onGoalClick: () => void;
  onSubClick: () => void;
}

export function MatchControls({
  matchId,
  status,
  currentQuarter,
  quarterCount,
  homeScore,
  awayScore,
  pausedAt,
  canAddGoals = true,
  canControlClock = true,
  canDoSubstitutions = true,
  onGoalClick,
  onSubClick,
}: MatchControlsProps) {
  const startMatch = useMutation(api.matchActions.start);
  const nextQuarter = useMutation(api.matchActions.nextQuarter);
  const resumeHalftime = useMutation(api.matchActions.resumeFromHalftime);
  const removeLastGoal = useMutation(api.matchActions.removeLastGoal);
  const pauseClockMut = useMutation(api.matchActions.pauseClock);
  const resumeClockMut = useMutation(api.matchActions.resumeClock);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undoConfirm, setUndoConfirm] = useState(false);
  const [endMatchConfirm, setEndMatchConfirm] = useState(false);

  const isFinalSegment = currentQuarter >= quarterCount;

  useEffect(() => {
    setEndMatchConfirm(false);
  }, [currentQuarter, status]);

  useEffect(() => {
    if (!undoConfirm) return;
    const timer = setTimeout(() => setUndoConfirm(false), 5000);
    return () => clearTimeout(timer);
  }, [undoConfirm]);

  useEffect(() => {
    if (!endMatchConfirm) return;
    const timer = setTimeout(() => setEndMatchConfirm(false), 5000);
    return () => clearTimeout(timer);
  }, [endMatchConfirm]);

  const totalGoals = homeScore + awayScore;

  const handleMutation = async (action: () => Promise<unknown>, actionName: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      console.error(`${actionName} failed:`, err);
      const message = err instanceof Error ? err.message : "Onbekende fout";
      setError(`Fout: ${message}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const isLive = status === "live";
  const isPaused = isLive && pausedAt != null;
  const isHalftime = status === "halftime";
  const isFinished = status === "finished";
  const isScheduled = status === "scheduled" || status === "lineup";

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
      {error && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

      {isScheduled && canControlClock && (
        <button
          onClick={() => handleMutation(() => startMatch({ matchId }), "Start wedstrijd")}
          disabled={isLoading}
          className="w-full py-4 bg-dia-green text-white text-xl font-bold rounded-xl min-h-[56px] active:scale-[0.98] transition-transform hover:bg-dia-green-light shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Bezig..." : "Start wedstrijd"}
        </button>
      )}

      {isLive && (
        <div className="space-y-3">
          {(canAddGoals || canDoSubstitutions) && (
            <div className={`grid gap-3 ${canAddGoals && canDoSubstitutions ? "grid-cols-2" : "grid-cols-1"}`}>
              {canAddGoals && (
                <button
                  onClick={onGoalClick}
                  disabled={isLoading}
                  className="py-5 bg-dia-green text-white text-xl font-bold rounded-xl min-h-[64px] active:scale-[0.98] transition-transform hover:bg-dia-green-light shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-2xl">⚽</span>
                  <span>GOAL!</span>
                </button>
              )}
              {canDoSubstitutions && (
                <button
                  onClick={onSubClick}
                  disabled={isLoading}
                  className="py-5 bg-blue-600 text-white text-xl font-bold rounded-xl min-h-[64px] active:scale-[0.98] transition-transform hover:bg-blue-700 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-2xl">🔄</span>
                  <span>Wissel</span>
                </button>
              )}
            </div>
          )}

          {canControlClock && (isPaused ? (
            <button
              onClick={() => handleMutation(() => resumeClockMut({ matchId }), "Hervat klok")}
              disabled={isLoading}
              className="w-full py-3 bg-dia-green text-white font-semibold rounded-xl min-h-[48px] active:scale-[0.98] transition-transform hover:bg-dia-green-light shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span className="text-lg">▶</span>
              {isLoading ? "Bezig..." : "Hervat klok"}
            </button>
          ) : (
            <button
              onClick={() => handleMutation(() => pauseClockMut({ matchId }), "Pauzeer klok")}
              disabled={isLoading}
              className="w-full py-3 bg-orange-500 text-white font-semibold rounded-xl min-h-[48px] active:scale-[0.98] transition-transform hover:bg-orange-600 shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span className="text-lg">⏸</span>
              {isLoading ? "Bezig..." : "Pauzeer klok"}
            </button>
          ))}

          {canControlClock &&
            (isFinalSegment ? (
              endMatchConfirm ? (
                <div className="space-y-2">
                  <p className="text-sm text-center text-gray-800 font-medium px-1">
                    Is de wedstrijd echt afgelopen?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEndMatchConfirm(false)}
                      disabled={isLoading}
                      className="flex-1 py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl min-h-[48px] active:scale-[0.98] transition-transform hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Annuleren
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEndMatchConfirm(false);
                        handleMutation(
                          () =>
                            nextQuarter({
                              matchId,
                              correlationId: createCorrelationId("next-quarter"),
                            }),
                          "Wedstrijd beëindigen"
                        );
                      }}
                      disabled={isLoading}
                      className="flex-1 py-3 bg-red-600 text-white font-semibold rounded-xl min-h-[48px] active:scale-[0.98] transition-transform hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? "Bezig..." : "Ja, beëindigen"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEndMatchConfirm(true)}
                  disabled={isLoading}
                  className="w-full py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl min-h-[48px] active:scale-[0.98] transition-transform hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Einde wedstrijd
                </button>
              )
            ) : (
              <button
                type="button"
                onClick={() =>
                  handleMutation(
                    () =>
                      nextQuarter({
                        matchId,
                        correlationId: createCorrelationId("next-quarter"),
                      }),
                    "Volgende kwart"
                  )
                }
                disabled={isLoading}
                className="w-full py-3 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl min-h-[48px] active:scale-[0.98] transition-transform hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Bezig..." : getNextQuarterLabel()}
              </button>
            ))}

          {totalGoals > 0 && (
            <UndoGoalButton
              isConfirming={undoConfirm}
              isLoading={isLoading}
              onFirstTap={() => setUndoConfirm(true)}
              onConfirm={() => {
                setUndoConfirm(false);
                handleMutation(
                  () => removeLastGoal({ matchId }),
                  "Doelpunt ongedaan maken"
                );
              }}
              onCancel={() => setUndoConfirm(false)}
            />
          )}
        </div>
      )}

      {isHalftime && canControlClock && (
        <button
          onClick={() => handleMutation(() => resumeHalftime({ matchId }), "Hervatten")}
          disabled={isLoading}
          className="w-full py-4 bg-dia-green text-white text-xl font-bold rounded-xl min-h-[56px] active:scale-[0.98] transition-transform hover:bg-dia-green-light shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Bezig..." : getResumeLabel()}
        </button>
      )}

      {isFinished && (
        <div className="text-center py-4">
          <p className="text-gray-500 font-medium">Wedstrijd is afgelopen</p>
        </div>
      )}
    </section>
  );
}

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
          className="flex-1 py-2 border-2 border-gray-300 text-gray-600 font-semibold rounded-xl min-h-[44px] active:scale-[0.98] transition-transform disabled:opacity-50"
        >
          Annuleren
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 py-2 bg-red-600 text-white font-semibold rounded-xl min-h-[44px] active:scale-[0.98] transition-transform disabled:opacity-50"
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
      className="w-full py-2 text-red-600 border-2 border-red-200 font-medium rounded-xl min-h-[44px] active:scale-[0.98] transition-transform hover:bg-red-50 hover:border-red-300 disabled:opacity-50 text-sm"
    >
      Laatste doelpunt ongedaan maken
    </button>
  );
}
