"use client";

import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { filterCoaches } from "@/lib/admin/adminListFilters";
import { CoachesFilterBar } from "./CoachesFilterBar";
import { CoachListRow } from "./CoachListRow";

interface Team {
  _id: Id<"teams">;
  name: string;
  clubName: string;
}

interface Coach {
  _id: Id<"coaches">;
  name: string;
  email?: string;
  teamIds: Id<"teams">[];
  teams: { id: Id<"teams">; name: string }[];
}

export function CoachesTab({ teams }: { teams: Team[] | undefined }) {
  const coaches = useQuery(api.admin.listCoaches) as Coach[] | undefined;
  const createCoach = useMutation(api.admin.createCoach);
  const updateCoach = useMutation(api.admin.updateCoach);
  const deleteCoach = useMutation(api.admin.deleteCoach);

  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("");
  const [teamLinkFilter, setTeamLinkFilter] = useState<
    "alle" | "met-team" | "zonder-team"
  >("alle");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newTeamIds, setNewTeamIds] = useState<Id<"teams">[]>([]);
  const [editingId, setEditingId] = useState<Id<"coaches"> | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editTeamIds, setEditTeamIds] = useState<Id<"teams">[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"coaches"> | null>(null);
  const [status, setStatus] = useState("");

  const visible = useMemo(
    () =>
      filterCoaches(coaches ?? [], {
        search,
        teamId: teamFilter,
        teamLinkFilter,
      }),
    [coaches, search, teamFilter, teamLinkFilter]
  );

  const toggleTeam = (
    teamId: Id<"teams">,
    current: Id<"teams">[],
    setter: (ids: Id<"teams">[]) => void
  ) => {
    setter(
      current.includes(teamId)
        ? current.filter((id) => id !== teamId)
        : [...current, teamId]
    );
  };

  async function handleCreate() {
    if (!newName.trim() || !newEmail.trim()) return;
    try {
      await createCoach({
        name: newName.trim(),
        email: newEmail.trim(),
        teamIds: newTeamIds,
      });
      setNewName("");
      setNewEmail("");
      setNewTeamIds([]);
      setStatus("Coach aangemaakt");
    } catch (error) {
      setStatus(`Fout: ${error instanceof Error ? error.message : "Onbekende fout"}`);
    }
  }

  async function handleUpdate(coachId: Id<"coaches">) {
    try {
      await updateCoach({
        coachId,
        name: editName.trim() || undefined,
        email: editEmail.trim() || undefined,
        teamIds: editTeamIds,
      });
      setEditingId(null);
      setStatus("Coach bijgewerkt");
    } catch (error) {
      setStatus(`Fout: ${error instanceof Error ? error.message : "Onbekende fout"}`);
    }
  }

  async function handleDelete(coachId: Id<"coaches">) {
    try {
      await deleteCoach({ coachId });
      setDeleteConfirm(null);
      setStatus("Coach verwijderd");
    } catch (error) {
      setStatus(`Fout: ${error instanceof Error ? error.message : "Onbekende fout"}`);
    }
  }

  return (
    <div className="space-y-4">
      <CoachesFilterBar
        search={search}
        onSearchChange={setSearch}
        teamFilter={teamFilter}
        onTeamFilterChange={setTeamFilter}
        teamLinkFilter={teamLinkFilter}
        onTeamLinkFilterChange={setTeamLinkFilter}
        teams={teams}
        visibleCount={visible.length}
        totalCount={coaches?.length ?? 0}
      />

      <div className="space-y-2">
        {coaches === undefined ? (
          <p className="text-gray-500">Laden...</p>
        ) : visible.length === 0 ? (
          <p className="text-gray-500">Geen coaches voor deze filters.</p>
        ) : (
          visible.map((coach) => (
            <CoachListRow
              key={coach._id}
              coach={coach}
              teams={teams}
              editingId={editingId}
              deleteConfirm={deleteConfirm}
              editName={editName}
              editEmail={editEmail}
              editTeamIds={editTeamIds}
              onEditName={setEditName}
              onEditEmail={setEditEmail}
              onToggleTeam={(teamId) =>
                toggleTeam(teamId, editTeamIds, setEditTeamIds)
              }
              onStartEdit={() => {
                setEditingId(coach._id);
                setEditName(coach.name);
                setEditEmail(coach.email ?? "");
                setEditTeamIds(coach.teamIds);
              }}
              onCancelEdit={() => setEditingId(null)}
              onSave={() => void handleUpdate(coach._id)}
              onAskDelete={() => setDeleteConfirm(coach._id)}
              onCancelDelete={() => setDeleteConfirm(null)}
              onConfirmDelete={() => void handleDelete(coach._id)}
            />
          ))
        )}
      </div>

      <div className="border-t pt-4">
        <h3 className="font-medium mb-2 flex items-center gap-2">
          <Plus size={18} /> Nieuwe coach
        </h3>
        <div className="space-y-2">
          <div className="grid gap-2 md:grid-cols-[1fr_1fr]">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Naam"
              className="px-3 py-2 border rounded-lg"
            />
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="E-mailadres"
              className="px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Teams:</label>
            <div className="flex flex-wrap gap-1">
              {teams?.map((team) => (
                <button
                  key={team._id}
                  type="button"
                  onClick={() => toggleTeam(team._id, newTeamIds, setNewTeamIds)}
                  className={`px-2 py-1 text-xs rounded ${
                    newTeamIds.includes(team._id)
                      ? "bg-dia-green text-black"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {team.name}
                </button>
              ))}
              {(!teams || teams.length === 0) && (
                <span className="text-sm text-gray-500">Geen teams beschikbaar</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={!newName.trim() || !newEmail.trim()}
            className="px-4 py-2 bg-dia-green text-black rounded-lg disabled:bg-gray-300"
          >
            Toevoegen
          </button>
        </div>
      </div>

      {status && <p className="text-sm p-2 bg-gray-100 rounded">{status}</p>}
    </div>
  );
}
