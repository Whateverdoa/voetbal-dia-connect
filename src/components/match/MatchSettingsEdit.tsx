"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import type { Match } from "./types";

interface MatchSettingsEditProps {
  match: Match;
  pin: string;
}

export function MatchSettingsEdit({ match, pin }: MatchSettingsEditProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [opponent, setOpponent] = useState(match.opponent);
  const [isHome, setIsHome] = useState(match.isHome);
  const [scheduledAt, setScheduledAt] = useState(
    match.scheduledAt
      ? new Date(match.scheduledAt).toISOString().slice(0, 16)
      : ""
  );
  const [addPlayerId, setAddPlayerId] = useState<string>("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerNumber, setNewPlayerNumber] = useState("");
  const [error, setError] = useState<string | null>(null);

  const updateMetadata = useMutation(api.matchActions.updateMatchMetadata);
  const addExistingPlayer = useMutation(api.matchActions.addExistingPlayerToMatch);
  const createAndAdd = useMutation(api.matchActions.createPlayerAndAddToMatch);
  const playersNotInMatch = useQuery(api.matches.listTeamPlayersNotInMatch, {
    matchId: match._id,
    pin,
  });

  const toggleCls = (active: boolean) =>
    `flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
      active ? "bg-dia-green text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
    }`;

  const handleSaveMetadata = async () => {
    setError(null);
    try {
      await updateMetadata({
        matchId: match._id,
        pin,
        opponent: opponent.trim() || undefined,
        isHome,
        scheduledAt: scheduledAt ? new Date(scheduledAt).getTime() : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout");
    }
  };

  const handleAddExisting = async () => {
    if (!addPlayerId) return;
    setError(null);
    try {
      await addExistingPlayer({
        matchId: match._id,
        pin,
        playerId: addPlayerId as Id<"players">,
      });
      setAddPlayerId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout");
    }
  };

  const handleCreateNew = async () => {
    if (!newPlayerName.trim()) return;
    setError(null);
    try {
      await createAndAdd({
        matchId: match._id,
        pin,
        name: newPlayerName.trim(),
        number: newPlayerNumber ? parseInt(newPlayerNumber, 10) : undefined,
      });
      setNewPlayerName("");
      setNewPlayerNumber("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout");
    }
  };

  return (
    <section className="bg-white rounded-xl shadow-md overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors min-h-[48px]"
      >
        <span className="font-semibold text-gray-700">Wedstrijdgegevens</span>
        <span className="text-gray-400 text-sm">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tegenstander
            </label>
            <input
              type="text"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Thuis / Uit
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsHome(true)}
                className={toggleCls(isHome)}
              >
                Thuis
              </button>
              <button
                type="button"
                onClick={() => setIsHome(false)}
                className={toggleCls(!isHome)}
              >
                Uit
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Datum/tijd
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <button
            onClick={handleSaveMetadata}
            className="w-full py-2 bg-dia-green text-white font-medium rounded-xl text-sm"
          >
            Wijzigingen opslaan
          </button>

          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-sm font-semibold text-gray-800 mb-2">
              Nieuwe speler toevoegen
            </h4>

            {playersNotInMatch && playersNotInMatch.length > 0 && (
              <div className="flex gap-2 mb-3">
                <select
                  value={addPlayerId}
                  onChange={(e) => setAddPlayerId(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="">Bestaande speler...</option>
                  {playersNotInMatch.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.number ? `${p.number}. ` : ""}{p.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddExisting}
                  disabled={!addPlayerId}
                  className="px-4 py-2 bg-dia-green text-white rounded-lg text-sm font-medium disabled:bg-gray-300"
                >
                  Toevoegen
                </button>
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <input
                type="text"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="Naam nieuwe speler"
                className="flex-1 min-w-[120px] px-3 py-2 border rounded-lg text-sm"
              />
              <input
                type="number"
                value={newPlayerNumber}
                onChange={(e) => setNewPlayerNumber(e.target.value)}
                placeholder="Nr"
                className="w-14 px-2 py-2 border rounded-lg text-sm"
                min={1}
                max={99}
              />
              <button
                onClick={handleCreateNew}
                disabled={!newPlayerName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:bg-gray-300"
              >
                Nieuwe speler maken
              </button>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
