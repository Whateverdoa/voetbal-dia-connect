"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Check, Pencil, Plus, ToggleLeft, ToggleRight, Trash2, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getPositionLabel } from "@/lib/positions";
import { PositionSelect } from "./PositionSelect";

interface Team {
  _id: Id<"teams">;
  name: string;
  clubName: string;
}

export function PlayersTab({ teams }: { teams: Team[] | undefined }) {
  const [selectedTeamId, setSelectedTeamId] = useState<Id<"teams"> | null>(null);
  const players = useQuery(
    api.admin.listPlayersByTeam,
    selectedTeamId ? { teamId: selectedTeamId } : "skip"
  );
  const createPlayer = useMutation(api.admin.createPlayer);
  const updatePlayer = useMutation(api.admin.updatePlayer);
  const deletePlayer = useMutation(api.admin.deletePlayer);

  const [newName, setNewName] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [newPositionPrimary, setNewPositionPrimary] = useState("");
  const [newPositionSecondary, setNewPositionSecondary] = useState("");
  const [editingId, setEditingId] = useState<Id<"players"> | null>(null);
  const [editName, setEditName] = useState("");
  const [editNumber, setEditNumber] = useState("");
  const [editPositionPrimary, setEditPositionPrimary] = useState("");
  const [editPositionSecondary, setEditPositionSecondary] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"players"> | null>(null);
  const [status, setStatus] = useState("");

  async function handleCreate() {
    if (!selectedTeamId || !newName.trim()) return;
    try {
      await createPlayer({
        teamId: selectedTeamId,
        name: newName.trim(),
        number: newNumber ? Number.parseInt(newNumber, 10) : undefined,
        positionPrimary: newPositionPrimary || undefined,
        positionSecondary: newPositionSecondary || undefined,
      });
      setNewName("");
      setNewNumber("");
      setNewPositionPrimary("");
      setNewPositionSecondary("");
      setStatus("Speler toegevoegd");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Onbekende fout";
      setStatus(`Fout: ${message}`);
    }
  }

  async function handleUpdate(playerId: Id<"players">) {
    try {
      await updatePlayer({
        playerId,
        name: editName.trim() || undefined,
        number: editNumber ? Number.parseInt(editNumber, 10) : undefined,
        positionPrimary: editPositionPrimary || undefined,
        positionSecondary: editPositionSecondary || undefined,
      });
      setEditingId(null);
      setStatus("Speler bijgewerkt");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Onbekende fout";
      setStatus(`Fout: ${message}`);
    }
  }

  async function handleToggleActive(playerId: Id<"players">, currentActive: boolean) {
    try {
      await updatePlayer({ playerId, active: !currentActive });
      setStatus(currentActive ? "Speler inactief" : "Speler actief");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Onbekende fout";
      setStatus(`Fout: ${message}`);
    }
  }

  async function handleDelete(playerId: Id<"players">) {
    try {
      await deletePlayer({ playerId });
      setDeleteConfirm(null);
      setStatus("Speler verwijderd");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Onbekende fout";
      setStatus(`Fout: ${message}`);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Team</label>
        <select
          value={selectedTeamId || ""}
          onChange={(event) => setSelectedTeamId((event.target.value as Id<"teams">) || null)}
          className="w-full px-3 py-2 border rounded-lg"
        >
          <option value="">Selecteer team...</option>
          {teams?.map((team) => (
            <option key={team._id} value={team._id}>
              {team.name} ({team.clubName})
            </option>
          ))}
        </select>
      </div>

      {selectedTeamId && (
        <div className="space-y-2">
          {players === undefined ? (
            <p className="text-gray-500">Laden...</p>
          ) : players.length === 0 ? (
            <p className="text-gray-500">Geen spelers in dit team.</p>
          ) : (
            players.map((player) => (
              <div
                key={player._id}
                className={`flex items-center gap-2 p-3 rounded-lg ${
                  player.active ? "bg-gray-50" : "bg-gray-200 opacity-60"
                }`}
              >
                {editingId === player._id ? (
                  <>
                    <input
                      type="number"
                      value={editNumber}
                      onChange={(event) => setEditNumber(event.target.value)}
                      placeholder="#"
                      className="w-16 px-2 py-1 border rounded"
                    />
                    <input
                      type="text"
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      className="flex-1 min-w-0 px-2 py-1 border rounded"
                      autoFocus
                    />
                    <PositionSelect value={editPositionPrimary} onChange={setEditPositionPrimary} placeholder="—" title="Positie 1" className="w-32 px-2 py-1 border rounded text-sm" />
                    <PositionSelect value={editPositionSecondary} onChange={setEditPositionSecondary} placeholder="—" title="Positie 2" className="w-32 px-2 py-1 border rounded text-sm" />
                    <button type="button" onClick={() => handleUpdate(player._id)} className="p-2 text-green-600 hover:bg-green-50 rounded">
                      <Check size={18} />
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className="p-2 text-gray-500 hover:bg-gray-100 rounded">
                      <X size={18} />
                    </button>
                  </>
                ) : deleteConfirm === player._id ? (
                  <>
                    <span className="flex-1 text-red-600">Verwijderen?</span>
                    <button type="button" onClick={() => handleDelete(player._id)} className="px-3 py-1 bg-red-600 text-white rounded text-sm">
                      Ja
                    </button>
                    <button type="button" onClick={() => setDeleteConfirm(null)} className="px-3 py-1 bg-gray-200 rounded text-sm">
                      Nee
                    </button>
                  </>
                ) : (
                  <>
                    <span className="w-10 text-center font-bold text-gray-500">
                      {player.number ? `#${player.number}` : "-"}
                    </span>
                    <span className="flex-1 min-w-0">{player.name}</span>
                    <span className="text-xs text-gray-500 shrink-0">
                      {(player as { positionPrimary?: string }).positionPrimary
                        ? getPositionLabel((player as { positionPrimary?: string }).positionPrimary!)
                        : ""}
                      {(player as { positionSecondary?: string }).positionSecondary
                        ? ` / ${getPositionLabel((player as { positionSecondary?: string }).positionSecondary!)}`
                        : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(player._id, player.active)}
                      className={`p-2 rounded ${
                        player.active
                          ? "text-green-600 hover:bg-green-50"
                          : "text-gray-400 hover:bg-gray-100"
                      }`}
                    >
                      {player.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(player._id);
                        setEditName(player.name);
                        setEditNumber(player.number?.toString() || "");
                        setEditPositionPrimary((player as { positionPrimary?: string }).positionPrimary ?? "");
                        setEditPositionSecondary((player as { positionSecondary?: string }).positionSecondary ?? "");
                      }}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(player._id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 size={18} />
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {selectedTeamId && (
        <div className="border-t pt-4">
          <h3 className="font-medium mb-2 flex items-center gap-2">
            <Plus size={18} /> Nieuwe speler
          </h3>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="number"
              value={newNumber}
              onChange={(event) => setNewNumber(event.target.value)}
              placeholder="#"
              className="w-20 px-3 py-2 border rounded-lg"
            />
            <input
              type="text"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Naam"
              className="flex-1 min-w-[120px] px-3 py-2 border rounded-lg"
            />
            <PositionSelect value={newPositionPrimary} onChange={setNewPositionPrimary} placeholder="Positie 1" title="Positie 1" className="px-3 py-2 border rounded-lg text-sm" />
            <PositionSelect value={newPositionSecondary} onChange={setNewPositionSecondary} placeholder="Positie 2" title="Positie 2" className="px-3 py-2 border rounded-lg text-sm" />
            <button
              type="button"
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="px-4 py-2 bg-dia-green text-white rounded-lg disabled:bg-gray-300"
            >
              Toevoegen
            </button>
          </div>
        </div>
      )}

      {status && <p className="text-sm p-2 bg-gray-100 rounded">{status}</p>}
    </div>
  );
}
