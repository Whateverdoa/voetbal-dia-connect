"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { Id } from "@/convex/_generated/dataModel";
import { getAdminPin } from "@/lib/adminSession";
import type { AdminMatch } from "./MatchRow";

interface MatchEditPanelProps {
  match: AdminMatch;
  editOpponent: string;
  setEditOpponent: (v: string) => void;
  editIsHome: boolean;
  setEditIsHome: (v: boolean) => void;
  editScheduledAt: string;
  setEditScheduledAt: (v: string) => void;
  editRefereeId: string;
  setEditRefereeId: (v: string) => void;
  addPlayerId: string;
  setAddPlayerId: (v: string) => void;
  newPlayerName: string;
  setNewPlayerName: (v: string) => void;
  newPlayerNumber: string;
  setNewPlayerNumber: (v: string) => void;
  referees: { id: Id<"referees">; name: string }[] | undefined;
  onSave: () => void;
  onAddPlayer: () => void;
  onCreatePlayer: () => void;
  onCancel: () => void;
}

export function MatchEditPanel({
  match,
  editOpponent,
  setEditOpponent,
  editIsHome,
  setEditIsHome,
  editScheduledAt,
  setEditScheduledAt,
  editRefereeId,
  setEditRefereeId,
  addPlayerId,
  setAddPlayerId,
  newPlayerName,
  setNewPlayerName,
  newPlayerNumber,
  setNewPlayerNumber,
  referees,
  onSave,
  onAddPlayer,
  onCreatePlayer,
  onCancel,
}: MatchEditPanelProps) {
  const adminPin = getAdminPin();
  const playersNotInMatch = useQuery(
    api.admin.listTeamPlayersNotInMatch,
    match.status === "scheduled"
      ? { matchId: match._id, adminPin }
      : "skip"
  );

  const toggleCls = (active: boolean) =>
    `flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
      active ? "bg-dia-green text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
    }`;

  return (
    <div className="ml-4 mt-1 p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
      {/* Metadata */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Tegenstander</label>
        <input
          type="text"
          value={editOpponent}
          onChange={(e) => setEditOpponent(e.target.value)}
          placeholder="Tegenstander"
          className="w-full px-3 py-2 border rounded-lg bg-white text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Thuis / Uit</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditIsHome(true)}
            className={toggleCls(editIsHome)}
          >
            Thuis
          </button>
          <button
            type="button"
            onClick={() => setEditIsHome(false)}
            className={toggleCls(!editIsHome)}
          >
            Uit
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Datum/tijd</label>
        <input
          type="datetime-local"
          value={editScheduledAt}
          onChange={(e) => setEditScheduledAt(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg bg-white text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Scheidsrechter
        </label>
        <select
          value={editRefereeId}
          onChange={(e) => setEditRefereeId(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg bg-white text-sm"
        >
          <option value="">Geen scheidsrechter</option>
          {referees?.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {/* Pregame: add players */}
      {match.status === "scheduled" && (
        <div className="border-t border-blue-200 pt-4 space-y-3">
          <h4 className="text-sm font-semibold text-gray-800">Speler toevoegen</h4>

          {playersNotInMatch && playersNotInMatch.length > 0 && (
            <div className="flex gap-2">
              <select
                value={addPlayerId}
                onChange={(e) => setAddPlayerId(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg bg-white text-sm"
              >
                <option value="">Bestaande speler...</option>
                {playersNotInMatch.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.number ? `${p.number}. ` : ""}{p.name}
                  </option>
                ))}
              </select>
              <button
                onClick={onAddPlayer}
                disabled={!addPlayerId}
                className="px-4 py-2 bg-dia-green text-white rounded-lg text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
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
              className="flex-1 min-w-[120px] px-3 py-2 border rounded-lg bg-white text-sm"
            />
            <input
              type="number"
              value={newPlayerNumber}
              onChange={(e) => setNewPlayerNumber(e.target.value)}
              placeholder="Nr"
              className="w-16 px-2 py-2 border rounded-lg bg-white text-sm"
              min={1}
              max={99}
            />
            <button
              onClick={onCreatePlayer}
              disabled={!newPlayerName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Nieuwe speler maken
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2 justify-end pt-2">
        <button
          onClick={onSave}
          className="px-4 py-1.5 bg-dia-green text-white rounded-lg text-sm font-medium"
        >
          Opslaan
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium"
        >
          Annuleren
        </button>
      </div>
    </div>
  );
}
