"use client";

import { Id } from "@/convex/_generated/dataModel";

export function DiaScorerPrompt({
  teamName,
  players,
  selectedPlayerId,
  onSelectPlayer,
  onConfirm,
  onSkip,
  onCancel,
  isLoading,
}: {
  teamName: string;
  players: {
    playerId: Id<"players">;
    name: string;
    number?: number;
    onField: boolean;
  }[];
  selectedPlayerId: Id<"players"> | null;
  onSelectPlayer: (id: Id<"players">) => void;
  onConfirm: () => void;
  onSkip: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const sortedPlayers = [...players].sort(
    (a, b) => Number(b.onField) - Number(a.onField)
  );

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3 animate-in fade-in duration-200">
      <p className="text-sm font-medium text-gray-700 text-center">
        Doelpunt voor <strong>{teamName}</strong>
      </p>
      <label className="block text-xs text-gray-500 text-center">
        Selecteer de scorer (DIA-team)
      </label>
      <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto">
        {sortedPlayers.map((player) => (
          <button
            key={String(player.playerId)}
            onClick={() => onSelectPlayer(player.playerId)}
            disabled={isLoading}
            className={`text-left px-3 py-2 rounded-lg border text-sm min-h-[44px] ${
              selectedPlayerId === player.playerId
                ? "border-dia-green bg-green-50"
                : "border-gray-200 bg-white hover:bg-gray-50"
            }`}
          >
            <span className="font-medium">{player.name}</span>
            {player.number != null ? ` (#${player.number})` : ""}
            <span className="block text-xs text-gray-500">
              {player.onField ? "Op veld" : "Bank"}
            </span>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="flex-1 py-3 border border-gray-300 text-gray-500 text-sm font-medium rounded-lg hover:bg-gray-100 disabled:opacity-50"
        >
          Annuleer
        </button>
        <button
          onClick={onSkip}
          disabled={isLoading}
          className="flex-1 py-3 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300 disabled:opacity-50"
        >
          {isLoading ? "Bezig..." : "Sla over"}
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading || !selectedPlayerId}
          className="flex-1 py-3 bg-dia-green text-white text-sm font-medium rounded-lg hover:bg-dia-green-light disabled:opacity-50"
        >
          {isLoading ? "Bezig..." : "Opslaan"}
        </button>
      </div>
    </div>
  );
}

export function ShirtNumberPrompt({
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

export function ScoreColumn({
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
          -
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
