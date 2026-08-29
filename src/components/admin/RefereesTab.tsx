"use client";

import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { normalizeQualificationTags } from "@/lib/admin/assignmentBoard";
import {
  filterRefereePool,
  summarizeRefereePool,
  type RefereePoolActiveFilter,
  type RefereePoolMembershipFilter,
  type RefereePoolTagsFilter,
} from "@/lib/admin/refereePoolFilters";
import { RefereesFilterBar } from "./RefereesFilterBar";
import {
  RefereeCreateForm,
  toggleQualificationTag,
} from "./RefereeCreateForm";
import {
  RefereePoolCard,
  type RefereePoolItem,
} from "./RefereePoolCard";

export function RefereesTab() {
  const referees = useQuery(api.admin.listReferees) as
    | RefereePoolItem[]
    | undefined;
  const createReferee = useMutation(api.admin.createReferee);
  const updateReferee = useMutation(api.admin.updateReferee);
  const deleteReferee = useMutation(api.admin.deleteReferee);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] =
    useState<RefereePoolActiveFilter>("actief");
  const [membershipFilter, setMembershipFilter] =
    useState<RefereePoolMembershipFilter>("alle");
  const [tagsFilter, setTagsFilter] = useState<RefereePoolTagsFilter>("alle");
  const [requiredTags, setRequiredTags] = useState<string[]>([]);

  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");
  const [newQualificationTags, setNewQualificationTags] = useState<string[]>([]);
  const [newShowPublicName, setNewShowPublicName] = useState(false);
  const [newInClaimPool, setNewInClaimPool] = useState(true);
  const [newCustomTag, setNewCustomTag] = useState("");

  const [editingId, setEditingId] = useState<Id<"referees"> | null>(null);
  const [edit, setEdit] = useState({
    name: "",
    email: "",
    contactEmail: "",
    active: true,
    inClaimPool: false,
    showPublicName: false,
    qualificationTags: [] as string[],
    customTag: "",
  });
  const [deleteConfirm, setDeleteConfirm] = useState<Id<"referees"> | null>(null);
  const [status, setStatus] = useState("");

  const summary = useMemo(
    () => summarizeRefereePool(referees ?? []),
    [referees]
  );
  const visible = useMemo(
    () =>
      filterRefereePool(referees ?? [], {
        search,
        activeFilter,
        membershipFilter,
        tagsFilter,
        requiredTags,
      }),
    [referees, search, activeFilter, membershipFilter, tagsFilter, requiredTags]
  );

  function fail(error: unknown) {
    setStatus(`Fout: ${error instanceof Error ? error.message : "Onbekende fout"}`);
  }

  function startEdit(referee: RefereePoolItem) {
    setEditingId(referee._id);
    setEdit({
      name: referee.name,
      email: referee.email ?? "",
      contactEmail: referee.contactEmail ?? "",
      active: referee.active,
      inClaimPool: referee.inClaimPool === true,
      showPublicName: referee.showPublicName === true,
      qualificationTags: normalizeQualificationTags(referee.qualificationTags),
      customTag: "",
    });
  }

  async function handleCreate() {
    if (!newName.trim() || !newEmail.trim()) return;
    try {
      await createReferee({
        name: newName.trim(),
        email: newEmail.trim(),
        inClaimPool: newInClaimPool,
        ...(newContactEmail.trim()
          ? { contactEmail: newContactEmail.trim() }
          : {}),
        qualificationTags: normalizeQualificationTags(newQualificationTags),
        ...(newShowPublicName ? { showPublicName: true } : {}),
      });
      setNewName("");
      setNewEmail("");
      setNewContactEmail("");
      setNewQualificationTags([]);
      setNewShowPublicName(false);
      setNewInClaimPool(true);
      setNewCustomTag("");
      setStatus("Scheidsrechter aangemaakt");
    } catch (error) {
      fail(error);
    }
  }

  return (
    <div className="space-y-5">
      <RefereesFilterBar
        search={search}
        onSearchChange={setSearch}
        activeFilter={activeFilter}
        onActiveFilterChange={setActiveFilter}
        membershipFilter={membershipFilter}
        onMembershipFilterChange={setMembershipFilter}
        tagsFilter={tagsFilter}
        onTagsFilterChange={setTagsFilter}
        requiredTags={requiredTags}
        onRequiredTagsChange={setRequiredTags}
        summary={summary}
        visibleCount={visible.length}
      />

      <div className="space-y-3">
        {referees === undefined ? (
          <p className="text-sm text-slate-500">Scheidsrechters laden...</p>
        ) : visible.length === 0 ? (
          <p className="text-sm text-slate-500">
            Geen scheidsrechters voor deze filters. Pas filters aan of zet
            legacy-coaches in de claimpoule.
          </p>
        ) : (
          visible.map((referee) => (
            <RefereePoolCard
              key={referee._id}
              referee={referee}
              isEditing={editingId === referee._id}
              isDeleting={deleteConfirm === referee._id}
              edit={edit}
              onEditChange={(patch) => setEdit((prev) => ({ ...prev, ...patch }))}
              onToggleTag={(tag) =>
                setEdit((prev) => ({
                  ...prev,
                  qualificationTags: toggleQualificationTag(
                    prev.qualificationTags,
                    tag
                  ),
                }))
              }
              onAddCustomTag={() => {
                if (!edit.customTag.trim()) return;
                setEdit((prev) => ({
                  ...prev,
                  qualificationTags: normalizeQualificationTags([
                    ...prev.qualificationTags,
                    prev.customTag,
                  ]),
                  customTag: "",
                }));
              }}
              onSave={() => {
                void updateReferee({
                  refereeId: referee._id,
                  name: edit.name.trim() || undefined,
                  email: edit.email.trim() || undefined,
                  contactEmail: edit.contactEmail.trim() || null,
                  active: edit.active,
                  inClaimPool: edit.inClaimPool,
                  qualificationTags: normalizeQualificationTags(
                    edit.qualificationTags
                  ),
                  showPublicName: edit.showPublicName,
                })
                  .then(() => {
                    setEditingId(null);
                    setStatus("Scheidsrechter bijgewerkt");
                  })
                  .catch(fail);
              }}
              onCancelEdit={() => setEditingId(null)}
              onStartEdit={() => startEdit(referee)}
              onTogglePool={() => {
                void updateReferee({
                  refereeId: referee._id,
                  inClaimPool: referee.inClaimPool !== true,
                })
                  .then(() =>
                    setStatus(
                      referee.inClaimPool === true
                        ? `${referee.name} uit claimpoule gehaald`
                        : `${referee.name} in claimpoule gezet`
                    )
                  )
                  .catch(fail);
              }}
              onAskDelete={() => setDeleteConfirm(referee._id)}
              onConfirmDelete={() => {
                void deleteReferee({ refereeId: referee._id })
                  .then(() => {
                    setDeleteConfirm(null);
                    setStatus("Scheidsrechter verwijderd");
                  })
                  .catch(fail);
              }}
              onCancelDelete={() => setDeleteConfirm(null)}
            />
          ))
        )}
      </div>

      <RefereeCreateForm
        name={newName}
        email={newEmail}
        contactEmail={newContactEmail}
        qualificationTags={newQualificationTags}
        showPublicName={newShowPublicName}
        inClaimPool={newInClaimPool}
        customTag={newCustomTag}
        onNameChange={setNewName}
        onEmailChange={setNewEmail}
        onContactEmailChange={setNewContactEmail}
        onShowPublicNameChange={setNewShowPublicName}
        onInClaimPoolChange={setNewInClaimPool}
        onCustomTagChange={setNewCustomTag}
        onToggleTag={(tag) =>
          setNewQualificationTags((c) => toggleQualificationTag(c, tag))
        }
        onAddCustomTag={() => {
          if (!newCustomTag.trim()) return;
          setNewQualificationTags((c) =>
            normalizeQualificationTags([...c, newCustomTag])
          );
          setNewCustomTag("");
        }}
        onSubmit={() => void handleCreate()}
      />

      {status && (
        <p className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">
          {status}
        </p>
      )}
    </div>
  );
}
