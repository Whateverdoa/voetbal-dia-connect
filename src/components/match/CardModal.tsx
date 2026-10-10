"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { createCorrelationId } from "@/lib/correlationId";
import type { CardType } from "@/lib/cards/cardRules";
import { CardIdentifyStep } from "./CardIdentifyStep";

export type CardModalPlayer = {
  playerId: Id<"players">;
  name: string;
  number?: number;
  onField: boolean;
  absent?: boolean;
  injured?: boolean;
};

interface CardModalProps {
  matchId: Id<"matches">;
  players: CardModalPlayer[];
  teamName?: string;
  opponentName?: string;
  skipNames?: boolean;
  onClose: () => void;
}

function parseShirtNumber(value: string): number | undefined {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 99) {
    return undefined;
  }
  return parsed;
}

/** Official (referee, or match lead without referee) registers a yellow or red card. */
export function CardModal({
  matchId,
  players,
  teamName = "DIA",
  opponentName = "Tegenstander",
  skipNames = false,
  onClose,
}: CardModalProps) {
  const [cardType, setCardType] = useState<CardType | null>(null);
  const [isOpponent, setIsOpponent] = useState(false);
  const [playerId, setPlayerId] = useState<Id<"players"> | null>(null);
  const [shirtNumber, setShirtNumber] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addCard = useMutation(api.matchActions.addCard);

  const eligible = players.filter(
    (player) => !(player.absent ?? false) && !(player.injured ?? false),
  );

  const resetIdentify = () => {
    setCardType(null);
    setIsOpponent(false);
    setPlayerId(null);
    setShirtNumber("");
    setPlayerName("");
  };

  const choose = (type: CardType, opponent: boolean) => {
    setCardType(type);
    setIsOpponent(opponent);
    setPlayerId(null);
    setShirtNumber("");
    setPlayerName("");
    setError(null);
  };

  const submit = async () => {
    if (!cardType) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const number = parseShirtNumber(shirtNumber);
      const name = playerName.trim() || undefined;
      await addCard({
        matchId,
        cardType,
        ...(isOpponent ? { isOpponentCard: true } : {}),
        ...(!isOpponent && playerId ? { playerId } : {}),
        ...(name ? { reportedName: name } : {}),
        ...(number != null ? { reportedNumber: number } : {}),
        correlationId: createCorrelationId(isOpponent ? "card-opp" : "card"),
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
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-md overflow-hidden rounded-t-2xl bg-white sm:rounded-2xl">
        <div className="space-y-4 p-6">
          <h2 className="text-center text-2xl font-bold">Kaart</h2>
          <p className="text-center text-sm text-gray-600">
            {teamName}: geel = 5 min tijdstraf; 2× geel / rood = uitsluiting.{" "}
            {opponentName}: alleen in de gebeurtenissen.
          </p>

          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {error}
            </div>
          ) : null}

          {!cardType ? (
            <div className="space-y-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => choose("yellow_card", false)}
                className="min-h-[64px] w-full rounded-xl bg-yellow-400 py-5 text-xl font-bold text-yellow-950 active:scale-[0.98] disabled:opacity-50"
              >
                🟨 Gele kaart · {teamName}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => choose("red_card", false)}
                className="min-h-[64px] w-full rounded-xl bg-red-600 py-5 text-xl font-bold text-white active:scale-[0.98] disabled:opacity-50"
              >
                🟥 Rode kaart · {teamName}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => choose("yellow_card", true)}
                className="min-h-[56px] w-full rounded-xl border-2 border-yellow-400 py-4 text-lg font-bold text-yellow-900 active:scale-[0.98] disabled:opacity-50"
              >
                🟨 Geel · {opponentName}
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => choose("red_card", true)}
                className="min-h-[56px] w-full rounded-xl border-2 border-red-600 py-4 text-lg font-bold text-red-700 active:scale-[0.98] disabled:opacity-50"
              >
                🟥 Rood · {opponentName}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="min-h-[48px] w-full py-3 font-medium text-gray-600"
              >
                Annuleren
              </button>
            </div>
          ) : (
            <CardIdentifyStep
              cardType={cardType}
              isOpponent={isOpponent}
              teamName={teamName}
              opponentName={opponentName}
              players={eligible}
              playerId={playerId}
              shirtNumber={shirtNumber}
              playerName={playerName}
              isSubmitting={isSubmitting}
              onPlayerId={setPlayerId}
              onShirtNumber={setShirtNumber}
              onPlayerName={setPlayerName}
              onBack={resetIdentify}
              onSave={() => void submit()}
              skipNames={skipNames}
            />
          )}
        </div>
      </div>
    </div>
  );
}
