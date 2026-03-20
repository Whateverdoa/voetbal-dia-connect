"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

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

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newTeamIds, setNewTeamIds] = useState<Id<"teams">[]>([]);
  const [editingId, setEditingId] = useState<Id<"coaches"> | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editTeamIds, setEditTeamIds] = useState<Id<"teams">[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"coaches"> | null>(null);
  const [status, setStatus] = useState("");

  const toggleTeam = (
    teamId: Id<"teams">,
    current: Id<"teams">[],
    setter: (ids: Id<"teams">[]) => void
  ) => {
    if (current.includes(teamId)) {
      setter(current.filter((id) => id !== teamId));
      return;
    }
    setter([...current, teamId]);
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
      const message = error instanceof Error ? error.message : "Onbekende fout";
      setStatus(`Fout: ${message}`);
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
      const message = error instanceof Error ? error.message : "Onbekende fout";
      setStatus(`Fout: ${message}`);
    }
  }

  async function handleDelete(coachId: Id<"coaches">) {
    try {
      await deleteCoach({ coachId });
      setDeleteConfirm(null);
      setStatus("Coach verwijderd");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Onbekende fout";
      setStatus(`Fout: ${message}`);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {coaches === undefined ? (
          <p className="text-gray-500">Laden...</p>
        ) : coaches.length === 0 ? (
          <p className="text-gray-500">Geen coaches.</p>
        ) : (
          coaches.map((coach) => (
            <div key={coach._id} className="p-3 bg-gray-50 rounded-lg">
              {editingId === coach._id ? (
                <div className="space-y-3">
                  <div className="grid gap-2 md:grid-cols-[1fr_1fr]">
                    <input
                      type="text"
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      placeholder="Naam"
                      className="px-3 py-2 border rounded"
                      autoFocus
                    />
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(event) => setEditEmail(event.target.value)}
                      placeholder="E-mailadres"
                      className="px-3 py-2 border rounded"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {teams?.map((team) => (
                      <button
                        key={team._id}
                        type="button"
                        onClick={() => toggleTeam(team._id, editTeamIds, setEditTeamIds)}
                        className={`px-2 py-1 text-xs rounded ${
                          editTeamIds.includes(team._id)
                            ? "bg-dia-green text-white"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {team.name}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => handleUpdate(coach._id)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded"
                    >
                      <Check size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ) : deleteConfirm === coach._id ? (
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-red-600">Coach verwijderen?</span>
                  <button
                    type="button"
                    onClick={() => handleDelete(coach._id)}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm"
                  >
                    Ja
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(null)}
                    className="px-3 py-1 bg-gray-200 rounded text-sm"
                  >
                    Nee
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{coach.name}</span>
                      <span className="text-sm text-gray-500">{coach.email ?? "Geen e-mail"}</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Teams: {coach.teams.length > 0 ? coach.teams.map((team) => team.name).join(", ") : "Geen"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(coach._id);
                      setEditName(coach.name);
                      setEditEmail(coach.email ?? "");
                      setEditTeamIds(coach.teamIds);
                    }}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(coach._id)}
                    className="p-2 text-red-500 hover:bg-red-50 rounded"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>
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
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Naam"
              className="px-3 py-2 border rounded-lg"
            />
            <input
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
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
                      ? "bg-dia-green text-white"
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
            onClick={handleCreate}
            disabled={!newName.trim() || !newEmail.trim()}
            className="px-4 py-2 bg-dia-green text-white rounded-lg disabled:bg-gray-300"
          >
            Toevoegen
          </button>
        </div>
      </div>

      {status && <p className="text-sm p-2 bg-gray-100 rounded">{status}</p>}
    </div>
  );
}
