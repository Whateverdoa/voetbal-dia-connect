"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { formatDateTimeInput } from "@/lib/dateUtils";
import type { Match } from "./types";
import { MatchTimingPresetPicker } from "./MatchTimingPresetPicker";
import {
  inferTimingPresetId,
  MATCH_TIMING_PRESETS,
  type MatchTimingPresetId,
} from "@/lib/matchTimingPresets";

interface MatchSettingsEditProps {
  match: Match;
}

export function MatchSettingsEdit({ match }: MatchSettingsEditProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [opponent, setOpponent] = useState(match.opponent);
  const [isHome, setIsHome] = useState(match.isHome);
  const [scheduledAt, setScheduledAt] = useState(
    formatDateTimeInput(match.scheduledAt)
  );
  const [timingPreset, setTimingPreset] = useState<MatchTimingPresetId>(
    () =>
      inferTimingPresetId(match.quarterCount, match.regulationDurationMinutes) ??
      "q4_15"
  );
  const [addPlayerId, setAddPlayerId] = useState<string>("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerNumber, setNewPlayerNumber] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savingMetadata, setSavingMetadata] = useState(false);
  const [saveAcknowledged, setSaveAcknowledged] = useState(false);

  const updateMetadata = useMutation(api.matchActions.updateMatchMetadata);
  const addExistingPlayer = useMutation(api.matchActions.addExistingPlayerToMatch);
  const createAndAdd = useMutation(api.matchActions.createPlayerAndAddToMatch);
  useEffect(() => {
    const id = inferTimingPresetId(
      match.quarterCount,
      match.regulationDurationMinutes
    );
    setTimingPreset(id ?? "q4_15");
  }, [match._id, match.quarterCount, match.regulationDurationMinutes]);

  useEffect(() => {
    if (!saveAcknowledged) return;
    const timer = window.setTimeout(() => setSaveAcknowledged(false), 3500);
    return () => window.clearTimeout(timer);
  }, [saveAcknowledged]);

  const playersNotInMatch = useQuery(api.matches.listTeamPlayersNotInMatch, {
    matchId: match._id,
  });

  const toggleCls = (active: boolean) =>
    `flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
      active ? "bg-dia-green text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
    }`;

  const handleSaveMetadata = async () => {
    setError(null);
    setSaveAcknowledged(false);
    setSavingMetadata(true);
    try {
      const timing = MATCH_TIMING_PRESETS[timingPreset];
      await updateMetadata({
        matchId: match._id,
        opponent: opponent.trim() || undefined,
        isHome,
        scheduledAt: scheduledAt ? new Date(scheduledAt).getTime() : undefined,
        quarterCount: timing.quarterCount,
        regulationDurationMinutes: timing.regulationDurationMinutes,
      });
      setSaveAcknowledged(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout");
    } finally {
      setSavingMetadata(false);
    }
  };

  const handleAddExisting = async () => {
    if (!addPlayerId) return;
    setError(null);
    try {
      await addExistingPlayer({
        matchId: match._id,
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
        type="button"
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

          <MatchTimingPresetPicker
            value={timingPreset}
            onChange={setTimingPreset}
            compact
          />

          <button
            type="button"
            onClick={handleSaveMetadata}
            disabled={savingMetadata}
            className="w-full py-2 bg-dia-green text-white font-medium rounded-xl text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {savingMetadata ? "Bezig met opslaan…" : "Wijzigingen opslaan"}
          </button>

          {saveAcknowledged && (
            <p
              className="text-sm text-green-800 bg-green-50 border border-green-200 px-3 py-2 rounded-lg"
              role="status"
            >
              Opgeslagen. Wijzigingen zijn bijgewerkt.
            </p>
          )}

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
                  {playersNotInMatch.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.number ? `${player.number}. ` : ""}{player.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button" onClick={handleAddExisting}
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
                type="button" onClick={handleCreateNew}
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
