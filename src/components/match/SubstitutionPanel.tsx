"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import clsx from "clsx";
import type { MatchPlayer } from "./types";

interface SubstitutionPanelProps {
  matchId: Id<"matches">;
  pin: string;
  playersOnField: MatchPlayer[];
  playersOnBench: MatchPlayer[];
  onClose: () => void;
}

export function SubstitutionPanel({
  matchId,
  pin,
  playersOnField,
  playersOnBench,
  onClose,
}: SubstitutionPanelProps) {
  const [playerOut, setPlayerOut] = useState<Id<"players"> | null>(null);
  const [playerIn, setPlayerIn] = useState<Id<"players"> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const substitute = useMutation(api.matchActions.substitute);

  const handleSubmit = async () => {
    if (!playerOut || !playerIn) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await substitute({
        matchId,
        pin,
        playerOutId: playerOut,
        playerInId: playerIn,
      });
      onClose();
    } catch (err) {
      console.error("Failed to substitute:", err);
      const message = err instanceof Error ? err.message : "Onbekende fout";
      if (message.includes("Invalid match or PIN")) {
        setError("Sessie verlopen. Sluit dit venster en herlaad de pagina.");
      } else {
        setError(`Fout bij wissel: ${message}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const playerOutData = playersOnField.find((p) => p.playerId === playerOut);
  const playerInData = playersOnBench.find((p) => p.playerId === playerIn);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <div className="p-6 flex-1 overflow-y-auto">
          <h2 className="text-xl font-bold mb-4">Wissel</h2>
          
          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Visual summary of substitution */}
          {(playerOut || playerIn) && (
            <div className="mb-4 p-3 bg-gray-100 rounded-xl flex items-center justify-center gap-3">
              <div className={clsx(
                "flex-1 text-center p-2 rounded-lg",
                playerOut ? "bg-red-100 text-red-700" : "bg-gray-200 text-gray-400"
              )}>
                {playerOutData ? (
                  <span className="font-medium">{playerOutData.name}</span>
                ) : (
                  <span>Eruit?</span>
                )}
              </div>
              <span className="text-2xl">→</span>
              <div className={clsx(
                "flex-1 text-center p-2 rounded-lg",
                playerIn ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-400"
              )}>
                {playerInData ? (
                  <span className="font-medium">{playerInData.name}</span>
                ) : (
                  <span>Erin?</span>
                )}
              </div>
            </div>
          )}

          {/* Player out selection */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-2">
              <span className="w-5 h-5 bg-red-100 rounded flex items-center justify-center text-xs">↓</span>
              Eruit (op het veld)
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {playersOnField.map((p) => (
                <button
                  key={p.playerId}
                  onClick={() => setPlayerOut(p.playerId)}
                  className={clsx(
                    "p-3 rounded-xl border-2 text-left min-h-[56px] transition-all active:scale-[0.98]",
                    playerOut === p.playerId
                      ? "border-red-500 bg-red-50 shadow-md"
                      : "border-green-200 bg-green-50 hover:border-green-300"
                  )}
                >
                  <div className="flex items-center gap-2">
                    {p.number && (
                      <span className="w-8 h-8 bg-green-200 rounded-lg flex items-center justify-center font-bold text-sm">
                        {p.number}
                      </span>
                    )}
                    <span className="font-medium truncate">{p.name}</span>
                    {p.isKeeper && (
                      <span className="text-xs bg-yellow-400 px-1.5 py-0.5 rounded">K</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Player in selection */}
          <div>
            <h3 className="text-sm font-semibold text-green-600 mb-2 flex items-center gap-2">
              <span className="w-5 h-5 bg-green-100 rounded flex items-center justify-center text-xs">↑</span>
              Erin (bank)
            </h3>
            {playersOnBench.length === 0 ? (
              <p className="text-gray-500 text-sm p-3 bg-gray-50 rounded-xl">
                Geen spelers op de bank
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {playersOnBench.map((p) => (
                  <button
                    key={p.playerId}
                    onClick={() => setPlayerIn(p.playerId)}
                    className={clsx(
                      "p-3 rounded-xl border-2 text-left min-h-[56px] transition-all active:scale-[0.98]",
                      playerIn === p.playerId
                        ? "border-green-500 bg-green-50 shadow-md"
                        : "border-gray-200 bg-gray-50 hover:border-gray-300"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {p.number && (
                        <span className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center font-bold text-sm text-gray-600">
                          {p.number}
                        </span>
                      )}
                      <span className="font-medium truncate">{p.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Fixed bottom actions */}
        <div className="p-4 border-t bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border-2 border-gray-300 rounded-xl font-semibold min-h-[48px]"
          >
            Annuleren
          </button>
          <button
            onClick={handleSubmit}
            disabled={!playerOut || !playerIn || isSubmitting}
            className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold min-h-[48px]
                       disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Bezig..." : "Wissel bevestigen"}
          </button>
        </div>
      </div>
    </div>
  );
}
