"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface LateRosterPanelProps {
  matchId: Id<"matches">;
}

export function LateRosterPanel({ matchId }: LateRosterPanelProps) {
  const playersNotInMatch = useQuery(api.matches.listTeamPlayersNotInMatch, {
    matchId,
  });
  const addExisting = useMutation(api.matchActions.addExistingPlayerToMatch);
  const createAndAdd = useMutation(api.matchActions.createPlayerAndAddToMatch);

  const [addPlayerId, setAddPlayerId] = useState("");
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onAddExisting = async () => {
    if (!addPlayerId) return;
    setBusy(true);
    setError(null);
    try {
      await addExisting({
        matchId,
        playerId: addPlayerId as Id<"players">,
      });
      setAddPlayerId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout");
    } finally {
      setBusy(false);
    }
  };

  const onCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      await createAndAdd({ matchId, name });
      setNewName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="bg-white rounded-xl shadow-md p-4 space-y-3">
      <h2 className="font-bold text-lg">Speler later toevoegen</h2>
      <p className="text-sm text-gray-600">
        Iemand erbij gekomen die niet in de selectie stond? Voeg die hier toe,
        ook na de aftrap of na afloop. Daarna kun je een doelpunt nog aanvullen.
      </p>

      {playersNotInMatch && playersNotInMatch.length > 0 && (
        <div className="flex gap-2">
          <select
            value={addPlayerId}
            onChange={(e) => setAddPlayerId(e.target.value)}
            className="flex-1 border border-gray-300 rounded-lg p-3 min-h-[48px] text-base"
          >
            <option value="">Bestaande speler…</option>
            {playersNotInMatch.map((player) => (
              <option key={player.id} value={player.id}>
                {player.number ? `${player.number}. ` : ""}
                {player.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void onAddExisting()}
            disabled={busy || !addPlayerId}
            className="px-4 min-h-[48px] bg-dia-black text-dia-yellow rounded-lg text-sm font-medium disabled:bg-gray-300"
          >
            Toevoegen
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Naam nieuwe speler"
          className="flex-1 px-3 py-3 border rounded-lg text-base min-h-[48px]"
        />
        <button
          type="button"
          onClick={() => void onCreate()}
          disabled={busy || !newName.trim()}
          className="px-4 min-h-[48px] bg-slate-800 text-white rounded-lg text-sm font-medium disabled:bg-gray-300"
        >
          Nieuw
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
          {error}
        </p>
      )}
    </section>
  );
}
