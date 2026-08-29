"use client";

import { Check, Pencil, Trash2, X } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";
import { normalizeQualificationTags } from "@/lib/admin/assignmentBoard";
import { RefereeShowPublicNameField } from "./RefereeShowPublicNameField";
import { QualificationTagPicker } from "./QualificationTagPicker";

export type RefereePoolItem = {
  _id: Id<"referees">;
  name: string;
  email?: string;
  contactEmail?: string;
  active: boolean;
  inClaimPool?: boolean;
  showPublicName?: boolean;
  qualificationTags?: string[];
};

type EditState = {
  name: string;
  email: string;
  contactEmail: string;
  active: boolean;
  inClaimPool: boolean;
  showPublicName: boolean;
  qualificationTags: string[];
  customTag: string;
};

export function RefereePoolCard({
  referee,
  isEditing,
  isDeleting,
  edit,
  onEditChange,
  onToggleTag,
  onAddCustomTag,
  onSave,
  onCancelEdit,
  onStartEdit,
  onTogglePool,
  onAskDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  referee: RefereePoolItem;
  isEditing: boolean;
  isDeleting: boolean;
  edit: EditState;
  onEditChange: (patch: Partial<EditState>) => void;
  onToggleTag: (tag: string) => void;
  onAddCustomTag: () => void;
  onSave: () => void;
  onCancelEdit: () => void;
  onStartEdit: () => void;
  onTogglePool: () => void;
  onAskDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  const tags = normalizeQualificationTags(referee.qualificationTags);
  const inPool = referee.inClaimPool === true;

  if (isEditing) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2">
          <input
            type="text"
            value={edit.name}
            onChange={(e) => onEditChange({ name: e.target.value })}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-dia-green"
            autoFocus
          />
          <input
            type="email"
            value={edit.email}
            onChange={(e) => onEditChange({ email: e.target.value })}
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-dia-green"
          />
          <input
            type="email"
            value={edit.contactEmail}
            onChange={(e) => onEditChange({ contactEmail: e.target.value })}
            placeholder="Contact e-mail (ouder)"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-dia-green md:col-span-2"
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={edit.active}
              onChange={(e) => onEditChange({ active: e.target.checked })}
              className="rounded"
            />
            Actief
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={edit.inClaimPool}
              onChange={(e) => onEditChange({ inClaimPool: e.target.checked })}
              className="rounded"
            />
            In claimpoule
          </label>
        </div>
        <RefereeShowPublicNameField
          className="mt-3"
          checked={edit.showPublicName}
          onChange={(showPublicName) => onEditChange({ showPublicName })}
        />
        <div className="mt-4">
          <QualificationTagPicker
            title="Kwalificaties"
            selectedTags={edit.qualificationTags}
            customTag={edit.customTag}
            onCustomTagChange={(customTag) => onEditChange({ customTag })}
            onToggleTag={onToggleTag}
            onAddCustomTag={onAddCustomTag}
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onSave}
            className="rounded-full border border-dia-yellow-deep/40 bg-dia-green-light p-2 text-dia-black"
          >
            <Check size={18} />
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            className="rounded-full border border-slate-200 p-2 text-slate-500"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    );
  }

  if (isDeleting) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        <p className="font-semibold">Scheidsrechter verwijderen?</p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onConfirmDelete}
            className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white"
          >
            Ja
          </button>
          <button
            type="button"
            onClick={onCancelDelete}
            className="rounded-xl border border-red-200 px-4 py-2 font-semibold"
          >
            Nee
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-900">{referee.name}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              {referee.email ?? "Geen e-mail"}
            </span>
            {!referee.active && (
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                Inactief
              </span>
            )}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                inPool
                  ? "bg-dia-green-light text-dia-black"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {inPool ? "In claimpoule" : "Buiten poule"}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {tags.length > 0 ? (
              tags.map((tag) => (
                <span
                  key={`${referee._id}-${tag}`}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500"
                >
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400">Nog geen kwalificaties</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onTogglePool}
            className="min-h-[40px] rounded-xl border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            {inPool ? "Uit poule" : "In poule"}
          </button>
          <button
            type="button"
            onClick={onStartEdit}
            className="rounded-full border border-slate-200 p-2 text-slate-500"
          >
            <Pencil size={18} />
          </button>
          <button
            type="button"
            onClick={onAskDelete}
            className="rounded-full border border-red-200 p-2 text-red-500"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
