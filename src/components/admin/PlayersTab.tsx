"use client";

import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  type ActiveListFilter,
  filterPlayers,
  filterTeamsBySearch,
} from "@/lib/admin/adminListFilters";
import { PositionSelect } from "./PositionSelect";
import { ConsentRoundPanel } from "./ConsentRoundPanel";
import { PlayersFilterBar } from "./PlayersFilterBar";
import { PlayerListRow } from "./PlayerListRow";

interface Team {
  _id: Id<"teams">;
  name: string;
  clubName: string;
}

type PlayerRow = {
  _id: Id<"players">;
  name: string;
  number?: number | null;
  active: boolean;
  positionPrimary?: string;
  positionSecondary?: string;
  photoUrl?: string;
};

export function PlayersTab({ teams }: { teams: Team[] | undefined }) {
  const [selectedTeamId, setSelectedTeamId] = useState<Id<"teams"> | null>(null);
  const [teamSearch, setTeamSearch] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveListFilter>("actief");
  const [position, setPosition] = useState("");

  const players = useQuery(
    api.admin.listPlayersByTeam,
    selectedTeamId ? { teamId: selectedTeamId } : "skip"
  ) as PlayerRow[] | undefined;
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

  const filteredTeams = useMemo(
    () => filterTeamsBySearch(teams ?? [], teamSearch),
    [teams, teamSearch]
  );

  const visiblePlayers = useMemo(
    () => filterPlayers(players ?? [], { search, activeFilter, position }),
    [players, search, activeFilter, position]
  );

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
      setStatus(`Fout: ${error instanceof Error ? error.message : "Onbekende fout"}`);
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
      setStatus(`Fout: ${error instanceof Error ? error.message : "Onbekende fout"}`);
    }
  }

  async function handleToggleActive(playerId: Id<"players">, currentActive: boolean) {
    try {
      await updatePlayer({ playerId, active: !currentActive });
      setStatus(currentActive ? "Speler inactief" : "Speler actief");
    } catch (error) {
      setStatus(`Fout: ${error instanceof Error ? error.message : "Onbekende fout"}`);
    }
  }

  async function handleDelete(playerId: Id<"players">) {
    try {
      await deletePlayer({ playerId });
      setDeleteConfirm(null);
      setStatus("Speler verwijderd");
    } catch (error) {
      setStatus(`Fout: ${error instanceof Error ? error.message : "Onbekende fout"}`);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="block text-sm font-medium">Team</label>
        <input
          type="search"
          value={teamSearch}
          onChange={(e) => setTeamSearch(e.target.value)}
          placeholder="Filter teams…"
          className="min-h-[44px] w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-dia-green"
        />
        <select
          value={selectedTeamId || ""}
          onChange={(e) =>
            setSelectedTeamId((e.target.value as Id<"teams">) || null)
          }
          className="w-full min-h-[44px] px-3 py-2 border rounded-lg"
        >
          <option value="">Selecteer team...</option>
          {filteredTeams.map((team) => (
            <option key={team._id} value={team._id}>
              {team.name} ({team.clubName})
            </option>
          ))}
        </select>
      </div>

      {selectedTeamId && (
        <div className="space-y-3">
          <ConsentRoundPanel teamId={selectedTeamId} onStatus={setStatus} />
          <PlayersFilterBar
            search={search}
            onSearchChange={setSearch}
            activeFilter={activeFilter}
            onActiveFilterChange={setActiveFilter}
            position={position}
            onPositionChange={setPosition}
            visibleCount={visiblePlayers.length}
            totalCount={players?.length ?? 0}
          />
          {players === undefined ? (
            <p className="text-gray-500">Laden...</p>
          ) : visiblePlayers.length === 0 ? (
            <p className="text-gray-500">Geen spelers voor deze filters.</p>
          ) : (
            visiblePlayers.map((player) => (
              <PlayerListRow
                key={player._id}
                player={player}
                editingId={editingId}
                deleteConfirm={deleteConfirm}
                editName={editName}
                editNumber={editNumber}
                editPositionPrimary={editPositionPrimary}
                editPositionSecondary={editPositionSecondary}
                onEditName={setEditName}
                onEditNumber={setEditNumber}
                onEditPositionPrimary={setEditPositionPrimary}
                onEditPositionSecondary={setEditPositionSecondary}
                onStartEdit={() => {
                  setEditingId(player._id);
                  setEditName(player.name);
                  setEditNumber(player.number?.toString() || "");
                  setEditPositionPrimary(player.positionPrimary ?? "");
                  setEditPositionSecondary(player.positionSecondary ?? "");
                }}
                onCancelEdit={() => setEditingId(null)}
                onSave={() => void handleUpdate(player._id)}
                onAskDelete={() => setDeleteConfirm(player._id)}
                onCancelDelete={() => setDeleteConfirm(null)}
                onConfirmDelete={() => void handleDelete(player._id)}
                onToggleActive={() =>
                  void handleToggleActive(player._id, player.active)
                }
                onPhotoDone={setStatus}
              />
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
              onChange={(e) => setNewNumber(e.target.value)}
              placeholder="#"
              className="w-20 px-3 py-2 border rounded-lg"
            />
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Naam"
              className="flex-1 min-w-[120px] px-3 py-2 border rounded-lg"
            />
            <PositionSelect
              value={newPositionPrimary}
              onChange={setNewPositionPrimary}
              placeholder="Positie 1"
              title="Positie 1"
              className="px-3 py-2 border rounded-lg text-sm"
            />
            <PositionSelect
              value={newPositionSecondary}
              onChange={setNewPositionSecondary}
              placeholder="Positie 2"
              title="Positie 2"
              className="px-3 py-2 border rounded-lg text-sm"
            />
            <button
              type="button"
              onClick={() => void handleCreate()}
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
