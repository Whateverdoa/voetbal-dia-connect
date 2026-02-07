"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Pencil, Trash2, Plus, X, Check } from "lucide-react";

export function TeamsTab({ clubId }: { clubId: Id<"clubs"> | null }) {
  const teams = useQuery(
    api.admin.listTeamsByClub,
    clubId ? { clubId } : "skip"
  );
  const createTeam = useMutation(api.admin.createTeam);
  const updateTeam = useMutation(api.admin.updateTeam);
  const deleteTeam = useMutation(api.admin.deleteTeam);

  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [editingId, setEditingId] = useState<Id<"teams"> | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"teams"> | null>(null);
  const [status, setStatus] = useState("");

  if (!clubId) {
    return <p className="text-gray-500">Selecteer eerst een club.</p>;
  }

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createTeam({
        clubId,
        name: newName.trim(),
        slug: newSlug.trim() || newName.toLowerCase().replace(/\s+/g, "-"),
      });
      setNewName("");
      setNewSlug("");
      setStatus("✅ Team aangemaakt");
    } catch (e: any) {
      setStatus(`❌ ${e.message}`);
    }
  };

  const handleUpdate = async (teamId: Id<"teams">) => {
    if (!editName.trim()) return;
    try {
      await updateTeam({ teamId, name: editName.trim() });
      setEditingId(null);
      setStatus("✅ Team bijgewerkt");
    } catch (e: any) {
      setStatus(`❌ ${e.message}`);
    }
  };

  const handleDelete = async (teamId: Id<"teams">) => {
    try {
      await deleteTeam({ teamId });
      setDeleteConfirm(null);
      setStatus("✅ Team verwijderd");
    } catch (e: any) {
      setStatus(`❌ ${e.message}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Team list */}
      <div className="space-y-2">
        {teams === undefined ? (
          <p className="text-gray-500">Laden...</p>
        ) : teams.length === 0 ? (
          <p className="text-gray-500">Geen teams.</p>
        ) : (
          teams.map((team) => (
            <div
              key={team._id}
              className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg"
            >
              {editingId === team._id ? (
                <>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 px-2 py-1 border rounded"
                    autoFocus
                  />
                  <button
                    onClick={() => handleUpdate(team._id)}
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
              ) : deleteConfirm === team._id ? (
                <>
                  <span className="flex-1 text-red-600">
                    Verwijderen? Alle spelers worden ook verwijderd!
                  </span>
                  <button
                    onClick={() => handleDelete(team._id)}
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
                  <span className="flex-1 font-medium">{team.name}</span>
                  <span className="text-sm text-gray-500 font-mono">
                    {team.slug}
                  </span>
                  <button
                    onClick={() => {
                      setEditingId(team._id);
                      setEditName(team.name);
                    }}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded"
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(team._id)}
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

      {/* Add new team */}
      <div className="border-t pt-4">
        <h3 className="font-medium mb-2 flex items-center gap-2">
          <Plus size={18} /> Nieuw team
        </h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Naam (bijv. JO12-1)"
            className="flex-1 px-3 py-2 border rounded-lg"
          />
          <input
            type="text"
            value={newSlug}
            onChange={(e) => setNewSlug(e.target.value)}
            placeholder="Slug (optioneel)"
            className="w-32 px-3 py-2 border rounded-lg"
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

      {status && (
        <p className="text-sm p-2 bg-gray-100 rounded">{status}</p>
      )}
    </div>
  );
}
