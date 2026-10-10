"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

interface LateRosterPanelProps {
  matchId: Id<"matches">;
}

/**
 * Match-leadership utility: add a player who was missing from the selection.
 * Kept collapsed so it does not dominate pitch-side live control.
 */
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
    <details className="rounded-lg border border-slate-200 bg-slate-50/80 text-slate-700">
      <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-slate-500 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="inline-flex w-full items-center justify-between gap-2">
          <span>Wedstrijdleiding · Speler later toevoegen</span>
          <span className="text-slate-400" aria-hidden>
            ▾
          </span>
        </span>
      </summary>

      <div className="space-y-3 border-t border-slate-200 px-3 py-3">
        <p className="text-xs text-slate-500">
          Alleen als iemand ontbreekt in deze wedstrijdselectie — ook na aftrap
          of na afloop. Daarna kun je een doelpunt nog aanvullen.
        </p>

        {playersNotInMatch && playersNotInMatch.length > 0 && (
          <div className="flex gap-2">
            <select
              value={addPlayerId}
              onChange={(e) => setAddPlayerId(e.target.value)}
              className="min-h-[44px] flex-1 rounded-lg border border-slate-300 bg-white p-2 text-sm"
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
              className="min-h-[44px] rounded-lg bg-slate-800 px-3 text-sm font-medium text-white disabled:bg-slate-300"
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
            className="min-h-[44px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={() => void onCreate()}
            disabled={busy || !newName.trim()}
            className="min-h-[44px] rounded-lg bg-slate-700 px-3 text-sm font-medium text-white disabled:bg-slate-300"
          >
            Nieuw
          </button>
        </div>

        {error ? (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </p>
        ) : null}
      </div>
    </details>
  );
}
