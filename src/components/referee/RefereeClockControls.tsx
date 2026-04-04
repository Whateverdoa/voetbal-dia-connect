"use client";

import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import type { MatchStatus } from "@/components/match/types";
import { createCorrelationId } from "@/lib/correlationId";

interface RefereeClockControlsProps {
  matchId: Id<"matches">;
  status: MatchStatus;
  currentQuarter: number;
  quarterCount: number;
  pausedAt?: number;
}

export function RefereeClockControls({
  matchId,
  status,
  currentQuarter,
  quarterCount,
  pausedAt,
}: RefereeClockControlsProps) {
  const startMatch = useMutation(api.matchActions.start);
  const nextQuarter = useMutation(api.matchActions.nextQuarter);
  const resumeHalftime = useMutation(api.matchActions.resumeFromHalftime);
  const pauseClockMut = useMutation(api.matchActions.pauseClock);
  const resumeClockMut = useMutation(api.matchActions.resumeClock);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [endMatchConfirm, setEndMatchConfirm] = useState(false);

  const isFinalSegment = currentQuarter >= quarterCount;

  useEffect(() => {
    setEndMatchConfirm(false);
  }, [currentQuarter, status]);

  useEffect(() => {
    if (!endMatchConfirm) return;
    const timer = setTimeout(() => setEndMatchConfirm(false), 5000);
    return () => clearTimeout(timer);
  }, [endMatchConfirm]);

  const isLive = status === "live";
  const isPaused = isLive && pausedAt != null;
  const isHalftime = status === "halftime";
  const isFinished = status === "finished";
  const isScheduled = status === "scheduled" || status === "lineup";

  const handleAction = async (action: () => Promise<unknown>) => {
    setIsLoading(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Onbekende fout";
      setError(`Fout: ${msg}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const quarterLabel = quarterCount === 2 ? "helft" : "kwart";

  return (
    <section className="bg-white rounded-xl shadow-md p-4 space-y-3">
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide text-center">
        Klokbediening
      </h2>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          {error}
        </div>
      )}

      {isScheduled && (
        <button
          onClick={() => handleAction(() => startMatch({ matchId }))}
          disabled={isLoading}
          className="w-full py-5 bg-dia-green text-white text-xl font-bold rounded-xl min-h-[64px] active:scale-[0.98] transition-transform hover:bg-dia-green-light shadow-lg disabled:opacity-50"
        >
          {isLoading ? "Bezig..." : "Start wedstrijd"}
        </button>
      )}

      {isLive && (
        <>
          {isPaused ? (
            <button
              onClick={() => handleAction(() => resumeClockMut({ matchId }))}
              disabled={isLoading}
              className="w-full py-5 bg-dia-green text-white text-xl font-bold rounded-xl min-h-[64px] active:scale-[0.98] transition-transform hover:bg-dia-green-light shadow-lg disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <span className="text-2xl">▶</span>
              {isLoading ? "Bezig..." : "Hervat klok"}
            </button>
          ) : (
            <button
              onClick={() => handleAction(() => pauseClockMut({ matchId }))}
              disabled={isLoading}
              className="w-full py-5 bg-orange-500 text-white text-xl font-bold rounded-xl min-h-[64px] active:scale-[0.98] transition-transform hover:bg-orange-600 shadow-lg disabled:opacity-50 flex items-center justify-center gap-3"
            >
              <span className="text-2xl">⏸</span>
              {isLoading ? "Bezig..." : "Pauzeer klok"}
            </button>
          )}

          {isFinalSegment ? (
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
                    className="flex-1 py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl min-h-[56px] active:scale-[0.98] transition-transform hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Annuleren
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEndMatchConfirm(false);
                      handleAction(() =>
                        nextQuarter({
                          matchId,
                          correlationId: createCorrelationId("next-quarter"),
                        })
                      );
                    }}
                    disabled={isLoading}
                    className="flex-1 py-4 bg-red-600 text-white font-semibold rounded-xl min-h-[56px] active:scale-[0.98] transition-transform hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="w-full py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl min-h-[56px] active:scale-[0.98] transition-transform hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Einde wedstrijd
              </button>
            )
          ) : (
            <button
              type="button"
              onClick={() =>
                handleAction(() =>
                  nextQuarter({
                    matchId,
                    correlationId: createCorrelationId("next-quarter"),
                  })
                )
              }
              disabled={isLoading}
              className="w-full py-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-xl min-h-[56px] active:scale-[0.98] transition-transform hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Bezig..." : `Einde ${quarterLabel} ${currentQuarter}`}
            </button>
          )}
        </>
      )}

      {isHalftime && (
        <button
          onClick={() => handleAction(() => resumeHalftime({ matchId }))}
          disabled={isLoading}
          className="w-full py-5 bg-dia-green text-white text-xl font-bold rounded-xl min-h-[64px] active:scale-[0.98] transition-transform hover:bg-dia-green-light shadow-lg disabled:opacity-50"
        >
          {isLoading ? "Bezig..." : `Start ${quarterLabel} ${currentQuarter}`}
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
