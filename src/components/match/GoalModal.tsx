"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import clsx from "clsx";
import type { MatchPlayer } from "./types";

interface GoalModalProps {
  matchId: Id<"matches">;
  pin: string;
  playersOnField: MatchPlayer[];
  onClose: () => void;
}

type GoalType = "our" | "opponent";

export function GoalModal({ matchId, pin, playersOnField, onClose }: GoalModalProps) {
  const [goalType, setGoalType] = useState<GoalType | null>(null);
  const [scorer, setScorer] = useState<Id<"players"> | null>(null);
  const [assist, setAssist] = useState<Id<"players"> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addGoal = useMutation(api.matchActions.addGoal);

  const handleOurGoal = () => setGoalType("our");
  const handleOpponentGoal = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await addGoal({ matchId, pin, isOpponentGoal: true });
      onClose();
    } catch (err) {
      console.error("Failed to add opponent goal:", err);
      const message = err instanceof Error ? err.message : "Onbekende fout";
      if (message.includes("Invalid match or PIN")) {
        setError("Sessie verlopen. Sluit dit venster en herlaad de pagina.");
      } else {
        setError(`Fout bij registreren: ${message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!scorer) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await addGoal({
        matchId,
        pin,
        playerId: scorer,
        assistPlayerId: assist ?? undefined,
        isOpponentGoal: false,
      });
      onClose();
    } catch (err) {
      console.error("Failed to add goal:", err);
      const message = err instanceof Error ? err.message : "Onbekende fout";
      if (message.includes("Invalid match or PIN")) {
        setError("Sessie verlopen. Sluit dit venster en herlaad de pagina.");
      } else {
        setError(`Fout bij registreren: ${message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 1: Choose goal type
  if (goalType === null) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
        <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-center mb-6">Doelpunt</h2>
            
            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
                {error}
              </div>
            )}
            
            {/* Giant goal buttons - 2 taps max! */}
            <div className="space-y-4">
              <button
                onClick={handleOurGoal}
                disabled={isSubmitting}
                className="w-full py-6 bg-dia-green text-white text-2xl font-bold rounded-xl 
                           min-h-[80px] active:scale-[0.98] transition-transform
                           hover:bg-dia-green-light shadow-lg flex items-center justify-center gap-3
                           disabled:opacity-50"
              >
                <span className="text-3xl">⚽</span>
                <span>GOAL!</span>
              </button>
              
              <button
                onClick={handleOpponentGoal}
                disabled={isSubmitting}
                className="w-full py-5 bg-red-600 text-white text-xl font-bold rounded-xl 
                           min-h-[64px] active:scale-[0.98] transition-transform
                           hover:bg-red-700 shadow-lg
                           disabled:opacity-50"
              >
                Tegendoelpunt
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-full mt-4 py-3 text-gray-600 font-medium min-h-[48px]"
            >
              Annuleren
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Select scorer (our goal)
  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="p-6 flex-1 overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">Wie scoorde?</h2>
          
          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Scorer selection - big touch targets */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            {playersOnField.map((p) => (
              <button
                key={p.playerId}
                onClick={() => setScorer(p.playerId)}
                className={clsx(
                  "p-3 rounded-xl border-2 text-left min-h-[56px] transition-all active:scale-[0.98]",
                  scorer === p.playerId
                    ? "border-dia-green bg-green-50 shadow-md"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className="flex items-center gap-2">
                  {p.number && (
                    <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center font-bold text-sm">
                      {p.number}
                    </span>
                  )}
                  <span className="font-medium truncate">{p.name}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Assist selection (optional) - only show if scorer selected */}
          {scorer && (
            <>
              <h3 className="text-lg font-semibold mb-3 text-gray-700">
                Assist (optioneel)
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setAssist(null)}
                  className={clsx(
                    "p-3 rounded-xl border-2 min-h-[48px] transition-all",
                    assist === null
                      ? "border-dia-green bg-green-50"
                      : "border-gray-200"
                  )}
                >
                  Geen assist
                </button>
                {playersOnField
                  .filter((p) => p.playerId !== scorer)
                  .map((p) => (
                    <button
                      key={p.playerId}
                      onClick={() => setAssist(p.playerId)}
                      className={clsx(
                        "p-3 rounded-xl border-2 text-left min-h-[48px] transition-all",
                        assist === p.playerId
                          ? "border-dia-green bg-green-50"
                          : "border-gray-200"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {p.number && (
                          <span className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center font-bold text-xs">
                            {p.number}
                          </span>
                        )}
                        <span className="font-medium text-sm truncate">{p.name}</span>
                      </div>
                    </button>
                  ))}
              </div>
            </>
          )}
        </div>

        {/* Fixed bottom actions */}
        <div className="p-4 border-t bg-gray-50 flex gap-3">
          <button
            onClick={() => setGoalType(null)}
            className="flex-1 py-3 border-2 border-gray-300 rounded-xl font-semibold min-h-[48px]"
          >
            Terug
          </button>
          <button
            onClick={handleSubmit}
            disabled={!scorer || isSubmitting}
            className="flex-1 py-3 bg-dia-green text-white rounded-xl font-semibold min-h-[48px]
                       disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Bezig..." : "Registreren"}
          </button>
        </div>
      </div>
    </div>
  );
}
