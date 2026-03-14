"use client";

import { useQuery, useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import { Pencil, Trash2, Plus, X, Check } from "lucide-react";

function getErrorMessage(err: unknown): string {
  if (err instanceof ConvexError) return String(err.data);
  return err instanceof Error ? err.message : "Onbekende fout";
}

interface Referee {
  _id: Id<"referees">;
  name: string;
  email?: string;
  active: boolean;
}

export function RefereesTab() {
  const referees = useQuery(api.admin.listReferees) as Referee[] | undefined;
  const createReferee = useMutation(api.admin.createReferee);
  const updateReferee = useMutation(api.admin.updateReferee);
  const deleteReferee = useMutation(api.admin.deleteReferee);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [editingId, setEditingId] = useState<Id<"referees"> | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"referees"> | null>(null);
  const [status, setStatus] = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createReferee({
        name: newName.trim(),
        email: newEmail.trim() || undefined,
      });
      setNewName("");
      setNewEmail("");
      setStatus("Scheidsrechter aangemaakt");
    } catch (err) {
      setStatus(`Fout: ${getErrorMessage(err)}`);
    }
  };

  const handleUpdate = async (refereeId: Id<"referees">) => {
    try {
      await updateReferee({
        refereeId,
        name: editName.trim() || undefined,
        email: editEmail.trim() || undefined,
        active: editActive,
      });
      setEditingId(null);
      setStatus("Scheidsrechter bijgewerkt");
    } catch (err) {
      setStatus(`Fout: ${getErrorMessage(err)}`);
    }
  };

  const handleDelete = async (refereeId: Id<"referees">) => {
    try {
      await deleteReferee({ refereeId });
      setDeleteConfirm(null);
      setStatus("Scheidsrechter verwijderd");
    } catch (err) {
      setStatus(`Fout: ${getErrorMessage(err)}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Referee list */}
      <div className="space-y-2">
        {referees === undefined ? (
          <p className="text-gray-500">Laden...</p>
        ) : referees.length === 0 ? (
          <p className="text-gray-500">Geen scheidsrechters.</p>
        ) : (
          referees.map((referee) => (
            <RefereeRow
              key={referee._id}
              referee={referee}
              isEditing={editingId === referee._id}
              isDeleting={deleteConfirm === referee._id}
              editName={editName}
              editEmail={editEmail}
              editActive={editActive}
              onEditNameChange={setEditName}
              onEditEmailChange={setEditEmail}
              onEditActiveChange={setEditActive}
              onStartEdit={() => {
                setEditingId(referee._id);
                setEditName(referee.name);
                setEditEmail(referee.email ?? "");
                setEditActive(referee.active);
              }}
              onConfirmEdit={() => handleUpdate(referee._id)}
              onCancelEdit={() => setEditingId(null)}
              onStartDelete={() => setDeleteConfirm(referee._id)}
              onConfirmDelete={() => handleDelete(referee._id)}
              onCancelDelete={() => setDeleteConfirm(null)}
            />
          ))
        )}
      </div>

      {/* Add new referee */}
      <div className="border-t pt-4">
        <h3 className="font-medium mb-2 flex items-center gap-2">
          <Plus size={18} /> Nieuwe scheidsrechter
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
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="E-mail (Clerk)"
              className="flex-1 px-3 py-2 border rounded-lg"
            />
          </div>
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

/** Single referee row with edit/delete states */
function RefereeRow({
  referee,
  isEditing,
  isDeleting,
  editName,
  editEmail,
  editActive,
  onEditNameChange,
  onEditEmailChange,
  onEditActiveChange,
  onStartEdit,
  onConfirmEdit,
  onCancelEdit,
  onStartDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  referee: Referee;
  isEditing: boolean;
  isDeleting: boolean;
  editName: string;
  editEmail: string;
  editActive: boolean;
  onEditNameChange: (v: string) => void;
  onEditEmailChange: (v: string) => void;
  onEditActiveChange: (v: boolean) => void;
  onStartEdit: () => void;
  onConfirmEdit: () => void;
  onCancelEdit: () => void;
  onStartDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  if (isEditing) {
    return (
      <div className="p-3 bg-gray-50 rounded-lg space-y-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={editName}
            onChange={(e) => onEditNameChange(e.target.value)}
            placeholder="Naam"
            className="flex-1 px-2 py-1 border rounded"
            autoFocus
          />
          <input
            type="email"
            value={editEmail}
            onChange={(e) => onEditEmailChange(e.target.value)}
            placeholder="E-mail (Clerk)"
            className="flex-1 px-2 py-1 border rounded"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={editActive}
            onChange={(e) => onEditActiveChange(e.target.checked)}
            className="rounded"
          />
          Actief
        </label>
        <div className="flex gap-2 justify-end">
          <button onClick={onConfirmEdit} className="p-2 text-green-600 hover:bg-green-50 rounded">
            <Check size={18} />
          </button>
          <button onClick={onCancelEdit} className="p-2 text-gray-500 hover:bg-gray-100 rounded">
            <X size={18} />
          </button>
        </div>
      </div>
    );
  }

  if (isDeleting) {
    return (
      <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-2">
        <span className="flex-1 text-red-600">Scheidsrechter verwijderen?</span>
        <button onClick={onConfirmDelete} className="px-3 py-1 bg-red-600 text-white rounded text-sm">
          Ja
        </button>
        <button onClick={onCancelDelete} className="px-3 py-1 bg-gray-200 rounded text-sm">
          Nee
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-2">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{referee.name}</span>
          {referee.email && (
            <span className="text-sm text-gray-500">{referee.email}</span>
          )}
          {!referee.active && (
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
              Inactief
            </span>
          )}
        </div>
      </div>
      <button onClick={onStartEdit} className="p-2 text-gray-500 hover:bg-gray-100 rounded">
        <Pencil size={18} />
      </button>
      <button onClick={onStartDelete} className="p-2 text-red-500 hover:bg-red-50 rounded">
        <Trash2 size={18} />
      </button>
    </div>
  );
}
