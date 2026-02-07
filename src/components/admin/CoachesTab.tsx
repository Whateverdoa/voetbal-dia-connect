"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Pencil, Trash2, Plus, X, Check } from "lucide-react";

interface Team {
  _id: Id<"teams">;
  name: string;
  clubName: string;
}

interface Coach {
  _id: Id<"coaches">;
  name: string;
  pin: string;
  teamIds: Id<"teams">[];
  teams: { id: Id<"teams">; name: string }[];
}

export function CoachesTab({ teams }: { teams: Team[] | undefined }) {
  const coaches = useQuery(api.admin.listCoaches) as Coach[] | undefined;
  const createCoach = useMutation(api.admin.createCoach);
  const updateCoach = useMutation(api.admin.updateCoach);
  const deleteCoach = useMutation(api.admin.deleteCoach);

  const [newName, setNewName] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newTeamIds, setNewTeamIds] = useState<Id<"teams">[]>([]);
  const [editingId, setEditingId] = useState<Id<"coaches"> | null>(null);
  const [editName, setEditName] = useState("");
  const [editPin, setEditPin] = useState("");
  const [editTeamIds, setEditTeamIds] = useState<Id<"teams">[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"coaches"> | null>(null);
  const [status, setStatus] = useState("");

  const handleCreate = async () => {
    if (!newName.trim() || !newPin.trim()) return;
    try {
      await createCoach({
        name: newName.trim(),
        pin: newPin.trim(),
        teamIds: newTeamIds,
      });
      setNewName("");
      setNewPin("");
      setNewTeamIds([]);
      setStatus("✅ Coach aangemaakt");
    } catch (e: any) {
      setStatus(`❌ ${e.message}`);
    }
  };

  const handleUpdate = async (coachId: Id<"coaches">) => {
    try {
      await updateCoach({
        coachId,
        name: editName.trim() || undefined,
        pin: editPin.trim() || undefined,
        teamIds: editTeamIds,
      });
      setEditingId(null);
      setStatus("✅ Coach bijgewerkt");
    } catch (e: any) {
      setStatus(`❌ ${e.message}`);
    }
  };

  const handleDelete = async (coachId: Id<"coaches">) => {
    try {
      await deleteCoach({ coachId });
      setDeleteConfirm(null);
      setStatus("✅ Coach verwijderd");
    } catch (e: any) {
      setStatus(`❌ ${e.message}`);
    }
  };

  const toggleTeam = (teamId: Id<"teams">, current: Id<"teams">[], setter: (ids: Id<"teams">[]) => void) => {
    if (current.includes(teamId)) {
      setter(current.filter((id) => id !== teamId));
    } else {
      setter([...current, teamId]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Coach list */}
      <div className="space-y-2">
        {coaches === undefined ? (
          <p className="text-gray-500">Laden...</p>
        ) : coaches.length === 0 ? (
          <p className="text-gray-500">Geen coaches.</p>
        ) : (
          coaches.map((coach) => (
            <div
              key={coach._id}
              className="p-3 bg-gray-50 rounded-lg"
            >
              {editingId === coach._id ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Naam"
                      className="flex-1 px-2 py-1 border rounded"
                      autoFocus
                    />
                    <input
                      type="text"
                      value={editPin}
                      onChange={(e) => setEditPin(e.target.value)}
                      placeholder="PIN"
                      className="w-24 px-2 py-1 border rounded font-mono"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {teams?.map((team) => (
                      <button
                        key={team._id}
                        onClick={() => toggleTeam(team._id, editTeamIds, setEditTeamIds)}
                        className={`px-2 py-1 text-xs rounded ${
                          editTeamIds.includes(team._id)
                            ? "bg-dia-green text-white"
                            : "bg-gray-200"
                        }`}
                      >
                        {team.name}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handleUpdate(coach._id)}
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
                  </div>
                </div>
              ) : deleteConfirm === coach._id ? (
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-red-600">Coach verwijderen?</span>
                  <button
                    onClick={() => handleDelete(coach._id)}
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
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{coach.name}</span>
                      <span className="text-sm text-gray-500 font-mono">
                        PIN: {coach.pin}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Teams: {coach.teams.length > 0 ? coach.teams.map((t) => t.name).join(", ") : "Geen"}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingId(coach._id);
                      setEditName(coach.name);
                      setEditPin(coach.pin);
                      setEditTeamIds(coach.teamIds);
                    }}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
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

      {/* Add new coach */}
      <div className="border-t pt-4">
        <h3 className="font-medium mb-2 flex items-center gap-2">
          <Plus size={18} /> Nieuwe coach
        </h3>
        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Naam"
              className="flex-1 px-3 py-2 border rounded-lg"
            />
            <input
              type="text"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              placeholder="PIN"
              className="w-24 px-3 py-2 border rounded-lg font-mono"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Teams:</label>
            <div className="flex flex-wrap gap-1">
              {teams?.map((team) => (
                <button
                  key={team._id}
                  onClick={() => toggleTeam(team._id, newTeamIds, setNewTeamIds)}
                  className={`px-2 py-1 text-xs rounded ${
                    newTeamIds.includes(team._id)
                      ? "bg-dia-green text-white"
                      : "bg-gray-200"
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
            onClick={handleCreate}
            disabled={!newName.trim() || !newPin.trim()}
            className="px-4 py-2 bg-dia-green text-white rounded-lg disabled:bg-gray-300"
          >
            Toevoegen
          </button>
        </div>
      </div>

      {status && (
        <p className="text-sm p-2 bg-gray-100 rounded">{status}</p>
      )}
    </div>
  );
}
