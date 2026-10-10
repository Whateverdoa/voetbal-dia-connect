"use client";

import clsx from "clsx";
import type { CardType } from "@/lib/cards/cardRules";
import type { CardModalPlayer } from "./CardModal";
import type { Id } from "@/convex/_generated/dataModel";

type CardIdentifyStepProps = {
  cardType: CardType;
  isOpponent: boolean;
  teamName: string;
  opponentName: string;
  players: CardModalPlayer[];
  playerId: Id<"players"> | null;
  shirtNumber: string;
  playerName: string;
  isSubmitting: boolean;
  onPlayerId: (id: Id<"players"> | null) => void;
  onShirtNumber: (value: string) => void;
  onPlayerName: (value: string) => void;
  onBack: () => void;
  onSave: () => void;
  skipNames?: boolean;
};

export function CardIdentifyStep({
  cardType,
  isOpponent,
  teamName,
  opponentName,
  players,
  playerId,
  shirtNumber,
  playerName,
  isSubmitting,
  onPlayerId,
  onShirtNumber,
  onPlayerName,
  onBack,
  onSave,
  skipNames = false,
}: CardIdentifyStepProps) {
  const showNames = !skipNames;

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-gray-800">
        {cardType === "yellow_card" ? "Gele kaart" : "Rode kaart"} voor{" "}
        {isOpponent ? opponentName : teamName}
      </p>
      <p className="text-sm text-gray-600">
        {skipNames
          ? "Rugnummer mag, maar hoeft niet."
          : isOpponent
            ? "Rugnummer of naam mag, maar hoeft niet."
            : `Rugnummer of naam mag. Ken je de ${teamName}-speler, dan mag je ook uit de lijst kiezen.`}
      </p>
      <div className={showNames ? "grid grid-cols-2 gap-2" : "grid grid-cols-1"}>
        <label className="space-y-1">
          <span className="text-xs font-medium text-gray-500">Rugnummer</span>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={99}
            value={shirtNumber}
            onChange={(event) => {
              onShirtNumber(event.target.value);
              onPlayerId(null);
            }}
            placeholder="#"
            className="w-full min-h-[48px] rounded-xl border border-gray-200 px-3 text-lg font-semibold"
          />
        </label>
        {showNames ? (
          <label className="col-span-1 space-y-1">
            <span className="text-xs font-medium text-gray-500">Naam</span>
            <input
              type="text"
              value={playerName}
              onChange={(event) => {
                onPlayerName(event.target.value);
                onPlayerId(null);
              }}
              placeholder="Naam"
              className="w-full min-h-[48px] rounded-xl border border-gray-200 px-3 text-base"
            />
          </label>
        ) : null}
      </div>
      {showNames && !isOpponent && players.length > 0 ? (
        <div className="max-h-48 space-y-2 overflow-y-auto">
          {players.map((player) => (
            <button
              key={player.playerId}
              type="button"
              onClick={() => {
                onPlayerId(player.playerId);
                onShirtNumber(player.number != null ? String(player.number) : "");
                onPlayerName(player.name);
              }}
              className={clsx(
                "w-full min-h-[48px] rounded-xl border-2 px-4 py-3 text-left font-medium",
                playerId === player.playerId
                  ? "border-dia-green bg-dia-green-light"
                  : "border-gray-200 bg-gray-50",
              )}
            >
              {player.number != null ? `${player.number}. ` : ""}
              {player.name}
              {player.onField ? "" : " (bank)"}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="min-h-[48px] flex-1 rounded-xl border-2 border-gray-300 font-semibold"
        >
          Terug
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onSave}
          className="min-h-[48px] flex-1 rounded-xl bg-dia-black font-semibold text-white disabled:opacity-50"
        >
          {isSubmitting ? "Bezig..." : "Opslaan"}
        </button>
      </div>
    </div>
  );
}
