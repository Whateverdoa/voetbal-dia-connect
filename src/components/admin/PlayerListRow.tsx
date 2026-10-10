"use client";

import { Check, Pencil, ToggleLeft, ToggleRight, Trash2, X } from "lucide-react";
import { Id } from "@/convex/_generated/dataModel";
import { getPositionLabel } from "@/lib/positions";
import { PositionSelect } from "./PositionSelect";
import { PlayerPhotoUpload } from "./PlayerPhotoUpload";

type Player = {
  _id: Id<"players">;
  name: string;
  number?: number | null;
  active: boolean;
  positionPrimary?: string;
  positionSecondary?: string;
  photoUrl?: string;
};

type Props = {
  player: Player;
  editingId: Id<"players"> | null;
  deleteConfirm: Id<"players"> | null;
  editName: string;
  editNumber: string;
  editPositionPrimary: string;
  editPositionSecondary: string;
  onEditName: (v: string) => void;
  onEditNumber: (v: string) => void;
  onEditPositionPrimary: (v: string) => void;
  onEditPositionSecondary: (v: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  onToggleActive: () => void;
  onPhotoDone: (msg: string) => void;
};

export function PlayerListRow({
  player,
  editingId,
  deleteConfirm,
  editName,
  editNumber,
  editPositionPrimary,
  editPositionSecondary,
  onEditName,
  onEditNumber,
  onEditPositionPrimary,
  onEditPositionSecondary,
  onStartEdit,
  onCancelEdit,
  onSave,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
  onToggleActive,
  onPhotoDone,
}: Props) {
  const rowClass = `flex items-center gap-2 p-3 rounded-lg ${
    player.active ? "bg-gray-50" : "bg-gray-200 opacity-60"
  }`;

  if (editingId === player._id) {
    return (
      <div className={rowClass}>
        <input
          type="number"
          value={editNumber}
          onChange={(e) => onEditNumber(e.target.value)}
          placeholder="#"
          className="w-16 px-2 py-1 border rounded"
        />
        <input
          type="text"
          value={editName}
          onChange={(e) => onEditName(e.target.value)}
          className="flex-1 min-w-0 px-2 py-1 border rounded"
          autoFocus
        />
        <PositionSelect
          value={editPositionPrimary}
          onChange={onEditPositionPrimary}
          placeholder="—"
          title="Positie 1"
          className="w-32 px-2 py-1 border rounded text-sm"
        />
        <PositionSelect
          value={editPositionSecondary}
          onChange={onEditPositionSecondary}
          placeholder="—"
          title="Positie 2"
          className="w-32 px-2 py-1 border rounded text-sm"
        />
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
    );
  }

  if (deleteConfirm === player._id) {
    return (
      <div className={rowClass}>
        <span className="flex-1 text-red-600">Verwijderen?</span>
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
    <div className={rowClass}>
      <span className="w-10 text-center font-bold text-gray-500">
        {player.number ? `#${player.number}` : "-"}
      </span>
      <span className="flex-1 min-w-0">{player.name}</span>
      <PlayerPhotoUpload
        playerId={player._id}
        photoUrl={player.photoUrl}
        onDone={onPhotoDone}
      />
      <span className="text-xs text-gray-500 shrink-0">
        {player.positionPrimary ? getPositionLabel(player.positionPrimary) : ""}
        {player.positionSecondary
          ? ` / ${getPositionLabel(player.positionSecondary)}`
          : ""}
      </span>
      <button
        type="button"
        onClick={onToggleActive}
        className={`p-2 rounded ${
          player.active
            ? "text-dia-black hover:bg-dia-green-light"
            : "text-gray-400 hover:bg-gray-100"
        }`}
      >
        {player.active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
      </button>
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
