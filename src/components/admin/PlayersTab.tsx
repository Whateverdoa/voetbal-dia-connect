"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Pencil, Trash2, Plus, X, Check, ToggleLeft, ToggleRight } from "lucide-react";

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
  const [editingId, setEditingId] = useState<Id<"players"> | null>(null);
  const [editName, setEditName] = useState("");
  const [editNumber, setEditNumber] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"players"> | null>(null);
  const [status, setStatus] = useState("");

  const handleCreate = async () => {
    if (!selectedTeamId || !newName.trim()) return;
    try {
      await createPlayer({
        teamId: selectedTeamId,
        name: newName.trim(),
        number: newNumber ? parseInt(newNumber) : undefined,
      });
      setNewName("");
      setNewNumber("");
      setStatus("✅ Speler toegevoegd");
    } catch (e: any) {
      setStatus(`❌ ${e.message}`);
    }
  };

  const handleUpdate = async (playerId: Id<"players">) => {
    try {
      await updatePlayer({
        playerId,
        name: editName.trim() || undefined,
        number: editNumber ? parseInt(editNumber) : undefined,
      });
      setEditingId(null);
      setStatus("✅ Speler bijgewerkt");
    } catch (e: any) {
      setStatus(`❌ ${e.message}`);
    }
  };

  const handleToggleActive = async (playerId: Id<"players">, currentActive: boolean) => {
    try {
      await updatePlayer({ playerId, active: !currentActive });
      setStatus(currentActive ? "⚪ Speler inactief" : "🟢 Speler actief");
    } catch (e: any) {
      setStatus(`❌ ${e.message}`);
    }
  };

  const handleDelete = async (playerId: Id<"players">) => {
    try {
      await deletePlayer({ playerId });
      setDeleteConfirm(null);
      setStatus("✅ Speler verwijderd");
    } catch (e: any) {
      setStatus(`❌ ${e.message}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Team selector */}
      <div>
        <label className="block text-sm font-medium mb-1">Team</label>
        <select
          value={selectedTeamId || ""}
          onChange={(e) => setSelectedTeamId(e.target.value as Id<"teams"> || null)}
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

      {/* Player list */}
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
                      onChange={(e) => setEditNumber(e.target.value)}
                      placeholder="#"
                      className="w-16 px-2 py-1 border rounded"
                    />
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-2 py-1 border rounded"
                      autoFocus
                    />
                    <button
                      onClick={() => handleUpdate(player._id)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded"
                    >
                      <Check size={18} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded"
                    >
                      <X size={18} />
                    </button>
                  </>
                ) : deleteConfirm === player._id ? (
                  <>
                    <span className="flex-1 text-red-600">Verwijderen?</span>
                    <button
                      onClick={() => handleDelete(player._id)}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm"
                    >
                      Ja
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-3 py-1 bg-gray-200 rounded text-sm"
                    >
                      Nee
                    </button>
                  </>
                ) : (
                  <>
                    <span className="w-10 text-center font-bold text-gray-500">
                      {player.number ? `#${player.number}` : "-"}
                    </span>
                    <span className="flex-1">{player.name}</span>
                    <button
                      onClick={() => handleToggleActive(player._id, player.active)}
                      className={`p-2 rounded ${
                        player.active
                          ? "text-green-600 hover:bg-green-50"
                          : "text-gray-400 hover:bg-gray-100"
                      }`}
                      title={player.active ? "Actief - klik om inactief te maken" : "Inactief - klik om actief te maken"}
                    >
                      {player.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                    <button
                      onClick={() => {
                        setEditingId(player._id);
                        setEditName(player.name);
                        setEditNumber(player.number?.toString() || "");
                      }}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
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

      {/* Add new player */}
      {selectedTeamId && (
        <div className="border-t pt-4">
          <h3 className="font-medium mb-2 flex items-center gap-2">
            <Plus size={18} /> Nieuwe speler
          </h3>
          <div className="flex gap-2">
            <input
              type="number"
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              placeholder="#"
              className="w-20 px-3 py-2 border rounded-lg"
            />
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Naam"
              className="flex-1 px-3 py-2 border rounded-lg"
            />
            <button
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="px-4 py-2 bg-dia-green text-white rounded-lg disabled:bg-gray-300"
            >
              Toevoegen
            </button>
          </div>
        </div>
      )}

      {status && (
        <p className="text-sm p-2 bg-gray-100 rounded">{status}</p>
      )}
    </div>
  );
}
