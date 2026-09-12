"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import clsx from "clsx";
import { createCorrelationId } from "@/lib/correlationId";
import type { CardType } from "@/lib/cards/cardRules";
import type { MatchPlayer } from "./types";

interface CardModalProps {
  matchId: Id<"matches">;
  players: MatchPlayer[];
  opponentName?: string;
  onClose: () => void;
}

/** Coach modal to register a yellow or red card during a live match. */
export function CardModal({
  matchId,
  players,
  opponentName = "Tegenstander",
  onClose,
}: CardModalProps) {
  const [cardType, setCardType] = useState<CardType | null>(null);
  const [playerId, setPlayerId] = useState<Id<"players"> | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addCard = useMutation(api.matchActions.addCard);

  const eligible = players.filter(
    (p) => !(p.absent ?? false) && !(p.injured ?? false)
  );

  const submitOwn = async () => {
    if (!cardType || !playerId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await addCard({
        matchId,
        playerId,
        cardType,
        correlationId: createCorrelationId("card"),
      });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Onbekende fout";
      setError(`Fout bij registreren: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitOpponent = async (type: CardType) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await addCard({
        matchId,
        cardType: type,
        isOpponentCard: true,
        correlationId: createCorrelationId("card-opp"),
      });
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Onbekende fout";
      setError(`Fout bij registreren: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden">
        <div className="p-6 space-y-4">
          <h2 className="text-2xl font-bold text-center">Kaart</h2>
          <p className="text-sm text-center text-gray-600">
            Eigen team: geel = 5 min tijdstraf; 2× geel / rood = uitsluiting.
            Tegenstander: alleen in de gebeurtenissen.
          </p>

          {error ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
              {error}
            </div>
          ) : null}

          {!cardType ? (
            <div className="space-y-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setCardType("yellow_card")}
                className="w-full py-5 bg-yellow-400 text-yellow-950 text-xl font-bold rounded-xl min-h-[64px] active:scale-[0.98] disabled:opacity-50"
              >
                🟨 Gele kaart (eigen team)
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setCardType("red_card")}
                className="w-full py-5 bg-red-600 text-white text-xl font-bold rounded-xl min-h-[64px] active:scale-[0.98] disabled:opacity-50"
              >
                🟥 Rode kaart (eigen team)
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void submitOpponent("yellow_card")}
                className="w-full py-4 border-2 border-yellow-400 text-yellow-900 text-lg font-bold rounded-xl min-h-[56px] active:scale-[0.98] disabled:opacity-50"
              >
                🟨 Geel · {opponentName}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => void submitOpponent("red_card")}
                className="w-full py-4 border-2 border-red-600 text-red-700 text-lg font-bold rounded-xl min-h-[56px] active:scale-[0.98] disabled:opacity-50"
              >
                🟥 Rood · {opponentName}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 text-gray-600 font-medium min-h-[48px]"
              >
                Annuleren
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-800">
                {cardType === "yellow_card"
                  ? "Gele kaart voor:"
                  : "Rode kaart voor:"}
              </p>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {eligible.map((player) => (
                  <button
                    key={player.playerId}
                    type="button"
                    onClick={() => setPlayerId(player.playerId)}
                    className={clsx(
                      "w-full text-left px-4 py-3 rounded-xl border-2 min-h-[48px] font-medium",
                      playerId === player.playerId
                        ? "border-dia-green bg-dia-green-light"
                        : "border-gray-200 bg-gray-50"
                    )}
                  >
                    {player.number != null ? `${player.number}. ` : ""}
                    {player.name}
                    {player.onField ? "" : " (bank)"}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCardType(null);
                    setPlayerId(null);
                  }}
                  className="flex-1 py-3 border-2 border-gray-300 rounded-xl font-semibold min-h-[48px]"
                >
                  Terug
                </button>
                <button
                  type="button"
                  disabled={!playerId || isSubmitting}
                  onClick={() => void submitOwn()}
                  className="flex-1 py-3 bg-dia-black text-white rounded-xl font-semibold min-h-[48px] disabled:opacity-50"
                >
                  {isSubmitting ? "Bezig..." : "Opslaan"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
