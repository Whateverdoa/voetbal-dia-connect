"use client";

import { Id } from "@/convex/_generated/dataModel";

interface Player {
  _id: Id<"players">;
  name: string;
  number?: number;
  active: boolean;
}

interface PlayerSelectorProps {
  players: Player[] | undefined;
  selectedIds: Set<Id<"players">>;
  onToggle: (playerId: Id<"players">) => void;
}

export function PlayerSelector({ players, selectedIds, onToggle }: PlayerSelectorProps) {
  if (players === undefined) {
    return <p className="text-sm text-gray-500">Spelers laden...</p>;
  }

  if (players.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Geen spelers voor dit team. Voeg eerst spelers toe.
      </p>
    );
  }

  const sorted = [...players].sort((a, b) => (a.number ?? 99) - (b.number ?? 99));

  return (
    <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
      {sorted.map((p) => (
        <label
          key={p._id}
          className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-sm transition-colors ${
            selectedIds.has(p._id)
              ? "bg-green-50 border border-green-300"
              : "bg-gray-50 border border-gray-200"
          } ${!p.active ? "opacity-50" : ""}`}
        >
          <input
            type="checkbox"
            checked={selectedIds.has(p._id)}
            onChange={() => onToggle(p._id)}
            className="accent-dia-green w-4 h-4 shrink-0"
          />
          <span className="font-bold w-6 text-right tabular-nums">
            {p.number ?? "-"}
          </span>
          <span className="truncate">{p.name}</span>
        </label>
      ))}
    </div>
  );
}
