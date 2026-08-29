"use client";

import { Check, Pencil, Trash2, X } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";

type Team = { _id: Id<"teams">; name: string };

type Coach = {
  _id: Id<"coaches">;
  name: string;
  email?: string;
  teamIds: Id<"teams">[];
  teams: { id: Id<"teams">; name: string }[];
};

type Props = {
  coach: Coach;
  teams: Team[] | undefined;
  editingId: Id<"coaches"> | null;
  deleteConfirm: Id<"coaches"> | null;
  editName: string;
  editEmail: string;
  editTeamIds: Id<"teams">[];
  onEditName: (v: string) => void;
  onEditEmail: (v: string) => void;
  onToggleTeam: (teamId: Id<"teams">) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
};

export function CoachListRow({
  coach,
  teams,
  editingId,
  deleteConfirm,
  editName,
  editEmail,
  editTeamIds,
  onEditName,
  onEditEmail,
  onToggleTeam,
  onStartEdit,
  onCancelEdit,
  onSave,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
}: Props) {
  if (editingId === coach._id) {
    return (
      <div className="p-3 bg-gray-50 rounded-lg space-y-3">
        <div className="grid gap-2 md:grid-cols-[1fr_1fr]">
          <input
            type="text"
            value={editName}
            onChange={(e) => onEditName(e.target.value)}
            placeholder="Naam"
            className="px-3 py-2 border rounded"
            autoFocus
          />
          <input
            type="email"
            value={editEmail}
            onChange={(e) => onEditEmail(e.target.value)}
            placeholder="E-mailadres"
            className="px-3 py-2 border rounded"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {teams?.map((team) => (
            <button
              key={team._id}
              type="button"
              onClick={() => onToggleTeam(team._id)}
              className={`px-2 py-1 text-xs rounded ${
                editTeamIds.includes(team._id)
                  ? "bg-dia-green text-black"
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
            onClick={onSave}
            className="p-2 text-dia-black hover:bg-dia-green-light rounded"
          >
            <Check size={18} />
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    );
  }

  if (deleteConfirm === coach._id) {
    return (
      <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-2">
        <span className="flex-1 text-red-600">Coach verwijderen?</span>
        <button
          type="button"
          onClick={onConfirmDelete}
          className="px-3 py-1 bg-red-600 text-white rounded text-sm"
        >
          Ja
        </button>
        <button
          type="button"
          onClick={onCancelDelete}
          className="px-3 py-1 bg-gray-200 rounded text-sm"
        >
          Nee
        </button>
      </div>
    );
  }

  return (
    <div className="p-3 bg-gray-50 rounded-lg flex items-center gap-2">
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">{coach.name}</span>
          <span className="text-sm text-gray-500">
            {coach.email ?? "Geen e-mail"}
          </span>
        </div>
        <p className="text-sm text-gray-500">
          Teams:{" "}
          {coach.teams.length > 0
            ? coach.teams.map((t) => t.name).join(", ")
            : "Geen"}
        </p>
      </div>
      <button
        type="button"
        onClick={onStartEdit}
        className="p-2 text-gray-500 hover:bg-gray-100 rounded"
      >
        <Pencil size={18} />
      </button>
      <button
        type="button"
        onClick={onAskDelete}
        className="p-2 text-red-500 hover:bg-red-50 rounded"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
}
