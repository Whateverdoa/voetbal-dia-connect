"use client";

import { Plus } from "lucide-react";
import { normalizeQualificationTags } from "@/lib/admin/assignmentBoard";
import { RefereeShowPublicNameField } from "./RefereeShowPublicNameField";
import { QualificationTagPicker } from "./QualificationTagPicker";

export function RefereeCreateForm({
  name,
  email,
  contactEmail,
  qualificationTags,
  showPublicName,
  inClaimPool,
  customTag,
  onNameChange,
  onEmailChange,
  onContactEmailChange,
  onShowPublicNameChange,
  onInClaimPoolChange,
  onCustomTagChange,
  onToggleTag,
  onAddCustomTag,
  onSubmit,
}: {
  name: string;
  email: string;
  contactEmail: string;
  qualificationTags: string[];
  showPublicName: boolean;
  inClaimPool: boolean;
  customTag: string;
  onNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onContactEmailChange: (v: string) => void;
  onShowPublicNameChange: (v: boolean) => void;
  onInClaimPoolChange: (v: boolean) => void;
  onCustomTagChange: (v: string) => void;
  onToggleTag: (tag: string) => void;
  onAddCustomTag: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
        <Plus size={18} />
        Nieuwe scheidsrechter
      </h3>
      <div className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Naam"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-dia-green"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            placeholder="E-mailadres"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-dia-green"
          />
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => onContactEmailChange(e.target.value)}
            placeholder="Contact e-mail ouder (optioneel)"
            className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-dia-green md:col-span-2"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={inClaimPool}
            onChange={(e) => onInClaimPoolChange(e.target.checked)}
            className="rounded"
          />
          Direct in claimpoule
        </label>
        <QualificationTagPicker
          title="Kwalificaties"
          selectedTags={qualificationTags}
          customTag={customTag}
          onCustomTagChange={onCustomTagChange}
          onToggleTag={onToggleTag}
          onAddCustomTag={onAddCustomTag}
        />
        <RefereeShowPublicNameField
          checked={showPublicName}
          onChange={onShowPublicNameChange}
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={!name.trim() || !email.trim()}
          className="rounded-2xl bg-dia-green px-5 py-3 text-sm font-semibold text-black disabled:bg-slate-300"
        >
          Toevoegen
        </button>
      </div>
    </div>
  );
}

export function toggleQualificationTag(currentTags: string[], tag: string) {
  if (currentTags.includes(tag)) {
    return currentTags.filter((t) => t !== tag);
  }
  return normalizeQualificationTags([...currentTags, tag]);
}
