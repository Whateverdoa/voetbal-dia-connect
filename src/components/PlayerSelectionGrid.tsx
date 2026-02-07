"use client";

import { Users } from "lucide-react";

interface Player {
  _id: string;
  name: string;
  number?: number | null;
  active: boolean;
}

interface PlayerSelectionGridProps {
  players: Player[] | undefined;
  selectedPlayers: Set<string>;
  onTogglePlayer: (playerId: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export function PlayerSelectionGrid({
  players,
  selectedPlayers,
  onTogglePlayer,
  onSelectAll,
  onDeselectAll,
}: PlayerSelectionGridProps) {
  const activePlayers = players?.filter((p) => p.active) || [];
  const allSelected =
    activePlayers.length > 0 && selectedPlayers.size === activePlayers.length;

  return (
    <section className="bg-white rounded-xl shadow p-5">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-gray-500" />
          <h2 className="font-semibold text-lg">Selectie</h2>
          <span className="bg-dia-green text-white text-sm px-2 py-0.5 rounded-full">
            {selectedPlayers.size}
          </span>
        </div>
        <button
          onClick={allSelected ? onDeselectAll : onSelectAll}
          className="text-sm text-dia-green hover:underline font-medium min-h-[44px] px-2"
        >
          {allSelected ? "Deselecteer alle" : "Selecteer alle"}
        </button>
      </div>

      {players === undefined ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-3 border-dia-green border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : activePlayers.length === 0 ? (
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500">Geen spelers in dit team</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {activePlayers
            .sort((a, b) => (a.number || 99) - (b.number || 99))
            .map((player) => {
              const isSelected = selectedPlayers.has(player._id);
              return (
                <button
                  key={player._id}
                  onClick={() => onTogglePlayer(player._id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all min-h-[56px] active:scale-[0.98] ${
                    isSelected
                      ? "border-dia-green bg-green-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${
                        isSelected
                          ? "bg-dia-green text-white"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {player.number || "?"}
                    </span>
                    <span className="font-medium text-gray-900 truncate">
                      {player.name}
                    </span>
                  </div>
                </button>
              );
            })}
        </div>
      )}
    </section>
  );
}
