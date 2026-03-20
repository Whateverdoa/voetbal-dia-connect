"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  REFEREE_QUALIFICATION_PRESETS,
  normalizeQualificationTags,
} from "@/lib/admin/assignmentBoard";

interface Referee {
  _id: Id<"referees">;
  name: string;
  email?: string;
  active: boolean;
  qualificationTags?: string[];
}

export function RefereesTab() {
  const referees = useQuery(api.admin.listReferees) as Referee[] | undefined;
  const createReferee = useMutation(api.admin.createReferee);
  const updateReferee = useMutation(api.admin.updateReferee);
  const deleteReferee = useMutation(api.admin.deleteReferee);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newQualificationTags, setNewQualificationTags] = useState<string[]>([]);
  const [newCustomTag, setNewCustomTag] = useState("");
  const [editingId, setEditingId] = useState<Id<"referees"> | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editQualificationTags, setEditQualificationTags] = useState<string[]>([]);
  const [editCustomTag, setEditCustomTag] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"referees"> | null>(null);
  const [status, setStatus] = useState("");

  function toggleTag(currentTags: string[], tag: string) {
    const normalized = normalizeQualificationTags([...currentTags, tag]);
    if (currentTags.includes(tag)) {
      return currentTags.filter((currentTag) => currentTag !== tag);
    }
    return normalized;
  }

  async function handleCreate() {
    if (!newName.trim() || !newEmail.trim()) return;
    try {
      await createReferee({
        name: newName.trim(),
        email: newEmail.trim(),
        qualificationTags: normalizeQualificationTags(newQualificationTags),
      });
      setNewName("");
      setNewEmail("");
      setNewQualificationTags([]);
      setNewCustomTag("");
      setStatus("Scheidsrechter aangemaakt");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Onbekende fout";
      setStatus(`Fout: ${message}`);
    }
  }

  async function handleUpdate(refereeId: Id<"referees">) {
    try {
      await updateReferee({
        refereeId,
        name: editName.trim() || undefined,
        email: editEmail.trim() || undefined,
        active: editActive,
        qualificationTags: normalizeQualificationTags(editQualificationTags),
      });
      setEditingId(null);
      setEditCustomTag("");
      setStatus("Scheidsrechter bijgewerkt");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Onbekende fout";
      setStatus(`Fout: ${message}`);
    }
  }

  async function handleDelete(refereeId: Id<"referees">) {
    try {
      await deleteReferee({ refereeId });
      setDeleteConfirm(null);
      setStatus("Scheidsrechter verwijderd");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Onbekende fout";
      setStatus(`Fout: ${message}`);
    }
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        {referees === undefined ? (
          <p className="text-sm text-slate-500">Scheidsrechters laden...</p>
        ) : referees.length === 0 ? (
          <p className="text-sm text-slate-500">Nog geen scheidsrechters beschikbaar.</p>
        ) : (
          referees.map((referee) => {
            const tags = normalizeQualificationTags(referee.qualificationTags);
            const isEditing = editingId === referee._id;
            const isDeleting = deleteConfirm === referee._id;

            if (isEditing) {
              return (
                <div key={referee._id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="grid gap-3 md:grid-cols-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(event) => setEditName(event.target.value)}
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-dia-green"
                      autoFocus
                    />
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(event) => setEditEmail(event.target.value)}
                      className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-dia-green"
                    />
                  </div>

                  <label className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={editActive}
                      onChange={(event) => setEditActive(event.target.checked)}
                      className="rounded"
                    />
                    Actief
                  </label>

                  <div className="mt-4">
                    <QualificationTagPicker
                      title="Kwalificaties"
                      selectedTags={editQualificationTags}
                      customTag={editCustomTag}
                      onCustomTagChange={setEditCustomTag}
                      onToggleTag={(tag) => setEditQualificationTags((current) => toggleTag(current, tag))}
                      onAddCustomTag={() => {
                        if (!editCustomTag.trim()) return;
                        setEditQualificationTags((current) =>
                          normalizeQualificationTags([...current, editCustomTag])
                        );
                        setEditCustomTag("");
                      }}
                    />
                  </div>

                  <div className="mt-4 flex justify-end gap-2">
                    <button type="button" onClick={() => handleUpdate(referee._id)} className="rounded-full border border-emerald-200 bg-emerald-50 p-2 text-emerald-600 transition hover:bg-emerald-100">
                      <Check size={18} />
                    </button>
                    <button type="button" onClick={() => setEditingId(null)} className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100">
                      <X size={18} />
                    </button>
                  </div>
                </div>
              );
            }

            if (isDeleting) {
              return (
                <div key={referee._id} className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <p className="font-semibold">Scheidsrechter verwijderen?</p>
                  <div className="mt-4 flex gap-2">
                    <button type="button" onClick={() => handleDelete(referee._id)} className="rounded-xl bg-red-600 px-4 py-2 font-semibold text-white">
                      Ja
                    </button>
                    <button type="button" onClick={() => setDeleteConfirm(null)} className="rounded-xl border border-red-200 px-4 py-2 font-semibold text-red-700">
                      Nee
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div key={referee._id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900">{referee.name}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                        {referee.email ?? "Geen e-mail"}
                      </span>
                      {!referee.active && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600">
                          Inactief
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tags.length > 0 ? (
                        tags.map((tag) => (
                          <span key={`${referee._id}-${tag}`} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-500">
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">Nog geen kwalificaties</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(referee._id);
                        setEditName(referee.name);
                        setEditEmail(referee.email ?? "");
                        setEditActive(referee.active);
                        setEditQualificationTags(tags);
                        setEditCustomTag("");
                      }}
                      className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100"
                    >
                      <Pencil size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(referee._id)}
                      className="rounded-full border border-red-200 p-2 text-red-500 transition hover:bg-red-50"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
          <Plus size={18} />
          Nieuwe scheidsrechter
        </h3>
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <input
              type="text"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Naam"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-dia-green"
            />
            <input
              type="email"
              value={newEmail}
              onChange={(event) => setNewEmail(event.target.value)}
              placeholder="E-mailadres"
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-dia-green"
            />
          </div>

          <QualificationTagPicker
            title="Kwalificaties"
            selectedTags={newQualificationTags}
            customTag={newCustomTag}
            onCustomTagChange={setNewCustomTag}
            onToggleTag={(tag) => setNewQualificationTags((current) => toggleTag(current, tag))}
            onAddCustomTag={() => {
              if (!newCustomTag.trim()) return;
              setNewQualificationTags((current) =>
                normalizeQualificationTags([...current, newCustomTag])
              );
              setNewCustomTag("");
            }}
          />

          <button
            type="button"
            onClick={handleCreate}
            disabled={!newName.trim() || !newEmail.trim()}
            className="rounded-2xl bg-dia-green px-5 py-3 text-sm font-semibold text-white transition hover:bg-dia-green-light disabled:bg-slate-300"
          >
            Toevoegen
          </button>
        </div>
      </div>

      {status && <p className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">{status}</p>}
    </div>
  );
}

function QualificationTagPicker({
  title,
  selectedTags,
  customTag,
  onCustomTagChange,
  onToggleTag,
  onAddCustomTag,
}: {
  title: string;
  selectedTags: string[];
  customTag: string;
  onCustomTagChange: (value: string) => void;
  onToggleTag: (tag: string) => void;
  onAddCustomTag: () => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="text-sm font-medium text-slate-700">{title}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        {REFEREE_QUALIFICATION_PRESETS.map((tag) => {
          const active = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggleTag(tag)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                active ? "bg-dia-green text-white" : "bg-white text-slate-500 hover:bg-slate-100"
              }`}
            >
              {tag}
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          type="text"
          value={customTag}
          onChange={(event) => onCustomTagChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              onAddCustomTag();
            }
          }}
          placeholder="Custom tag, bijv. JO11"
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-dia-green"
        />
        <button
          type="button"
          onClick={onAddCustomTag}
          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
        >
          Voeg toe
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {selectedTags.length > 0 ? (
          selectedTags.map((tag) => (
            <span key={tag} className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
              {tag}
            </span>
          ))
        ) : (
          <span className="text-xs text-slate-400">Nog geen kwalificaties geselecteerd.</span>
        )}
      </div>
    </div>
  );
}
