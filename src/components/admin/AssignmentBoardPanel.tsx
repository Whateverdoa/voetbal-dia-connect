"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import clsx from "clsx";
import { AlertTriangle, Check, Flag, Plus, Save, Trash2, X } from "lucide-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { getQualificationState } from "@/lib/admin/assignmentBoard";
import { formatDateTimeInput } from "@/lib/dateUtils";
import { formatMatchDate } from "@/types/publicMatch";
import type { ActiveRefereeOption, AssignmentBoardMatch } from "./types";

const qualificationStyles = {
  geschikt: "bg-emerald-100 text-emerald-700",
  mogelijk: "bg-amber-100 text-amber-700",
  onbekend: "bg-slate-200 text-slate-600",
};

export function AssignmentBoardPanel({
  match,
  referees,
  onClose,
  onStatusMessage,
}: {
  match: AssignmentBoardMatch;
  referees: ActiveRefereeOption[] | undefined;
  onClose: () => void;
  onStatusMessage: (message: string) => void;
}) {
  const updateMatch = useMutation(api.admin.updateMatch);
  const addPlayerToMatch = useMutation(api.admin.addPlayerToMatch);
  const createPlayerAndAddToMatch = useMutation(api.admin.createPlayerAndAddToMatch);
  const deleteMatch = useMutation(api.admin.deleteMatch);
  const playersNotInMatch = useQuery(
    api.admin.listTeamPlayersNotInMatch,
    match.status === "scheduled" ? { matchId: match._id } : "skip"
  );

  const [opponent, setOpponent] = useState(match.opponent);
  const [isHome, setIsHome] = useState(match.isHome);
  const [scheduledAt, setScheduledAt] = useState(formatDateTimeInput(match.scheduledAt));
  const [selectedRefereeId, setSelectedRefereeId] = useState<string>(match.refereeId ?? "");
  const [addPlayerId, setAddPlayerId] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerNumber, setNewPlayerNumber] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setOpponent(match.opponent);
    setIsHome(match.isHome);
    setScheduledAt(formatDateTimeInput(match.scheduledAt));
    setSelectedRefereeId(match.refereeId ?? "");
    setAddPlayerId("");
    setNewPlayerName("");
    setNewPlayerNumber("");
    setConfirmDelete(false);
    setSaving(false);
  }, [match]);

  const selectedReferee = referees?.find((referee) => referee.id === selectedRefereeId);
  const selectedQualificationState = getQualificationState(
    match.matchQualificationTags,
    selectedReferee?.qualificationTags
  );

  function resetFields() {
    setOpponent(match.opponent);
    setIsHome(match.isHome);
    setScheduledAt(formatDateTimeInput(match.scheduledAt));
    setSelectedRefereeId(match.refereeId ?? "");
    setAddPlayerId("");
    setNewPlayerName("");
    setNewPlayerNumber("");
    setConfirmDelete(false);
  }

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      await updateMatch({
        matchId: match._id,
        opponent: opponent.trim(),
        isHome,
        scheduledAt: scheduledAt ? new Date(scheduledAt).getTime() : undefined,
        refereeId: selectedRefereeId ? (selectedRefereeId as Id<"referees">) : null,
      });
      onStatusMessage("Wedstrijd bijgewerkt");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Onbekende fout";
      onStatusMessage(`Fout: ${message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddPlayer() {
    if (!addPlayerId) return;
    try {
      await addPlayerToMatch({ matchId: match._id, playerId: addPlayerId as Id<"players"> });
      setAddPlayerId("");
      onStatusMessage("Speler toegevoegd");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Onbekende fout";
      onStatusMessage(`Fout: ${message}`);
    }
  }

  async function handleCreatePlayer() {
    if (!newPlayerName.trim()) return;
    try {
      await createPlayerAndAddToMatch({
        matchId: match._id,
        name: newPlayerName.trim(),
        number: newPlayerNumber ? Number.parseInt(newPlayerNumber, 10) : undefined,
      });
      setNewPlayerName("");
      setNewPlayerNumber("");
      onStatusMessage("Nieuwe speler aangemaakt en toegevoegd");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Onbekende fout";
      onStatusMessage(`Fout: ${message}`);
    }
  }

  async function handleDelete() {
    try {
      await deleteMatch({ matchId: match._id });
      onStatusMessage("Wedstrijd verwijderd");
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Onbekende fout";
      onStatusMessage(`Fout: ${message}`);
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm" onClick={onClose} />
      <aside className="fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-hidden rounded-t-[28px] border border-slate-200 bg-white shadow-2xl md:inset-y-4 md:right-4 md:left-auto md:w-[460px] md:max-h-none md:rounded-[28px]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-dia-green">Wedstrijdpaneel</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{match.teamName}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100" aria-label="Paneel sluiten">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(88vh-74px)] overflow-y-auto px-5 py-5 md:max-h-[calc(100vh-106px)]">
          <div className="space-y-5">
            <section className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Wedstrijd</h3>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-500 shadow-sm">{match.publicCode}</span>
              </div>

              <div className="mt-4 space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-600">Tegenstander</label>
                  <input
                    type="text"
                    value={opponent}
                    onChange={(event) => setOpponent(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-dia-green"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600">Thuis / Uit</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" onClick={() => setIsHome(true)} className={clsx("rounded-2xl px-4 py-3 text-sm font-semibold transition", isHome ? "bg-dia-green text-white" : "bg-white text-slate-600")}>
                        Thuis
                      </button>
                      <button type="button" onClick={() => setIsHome(false)} className={clsx("rounded-2xl px-4 py-3 text-sm font-semibold transition", !isHome ? "bg-dia-green text-white" : "bg-white text-slate-600")}>
                        Uit
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600">Datum/tijd</label>
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={(event) => setScheduledAt(event.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-dia-green"
                    />
                  </div>
                </div>

                <div className="grid gap-2 text-sm text-slate-500 sm:grid-cols-2">
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Status</div>
                    <div className="mt-1 font-medium text-slate-700">{match.status}</div>
                  </div>
                  <div className="rounded-2xl bg-white px-4 py-3">
                    <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Coach</div>
                    <div className="mt-1 font-medium text-slate-700">{match.coachName ?? "Nog niet gekoppeld"}</div>
                  </div>
                </div>

                <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-500">
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Gepland</div>
                  <div className="mt-1 font-medium text-slate-700">
                    {match.scheduledAt ? formatMatchDate(match.scheduledAt) : "Nog geen datum"}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {match.matchQualificationTags.map((tag) => (
                      <span key={tag} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Toewijzing</h3>
                <span className={clsx("rounded-full px-2.5 py-1 text-xs font-semibold", qualificationStyles[selectedQualificationState])}>
                  {selectedQualificationState}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={() => setSelectedRefereeId("")}
                  className={clsx(
                    "flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition",
                    selectedRefereeId ? "border-slate-200 bg-slate-50 hover:border-slate-300" : "border-dia-green bg-emerald-50"
                  )}
                >
                  <div>
                    <div className="font-medium text-slate-800">Geen scheidsrechter</div>
                    <div className="text-xs text-slate-500">Nog niet toewijzen</div>
                  </div>
                  {!selectedRefereeId && <Check size={16} className="text-dia-green" />}
                </button>

                <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                  {referees?.map((referee) => {
                    const qualificationState = getQualificationState(match.matchQualificationTags, referee.qualificationTags);
                    const isSelected = selectedRefereeId === referee.id;
                    return (
                      <button
                        key={referee.id}
                        type="button"
                        onClick={() => setSelectedRefereeId(referee.id)}
                        className={clsx(
                          "flex w-full items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition",
                          isSelected ? "border-dia-green bg-emerald-50" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                        )}
                      >
                        <div>
                          <div className="flex items-center gap-2 font-medium text-slate-800">
                            <Flag size={14} className="text-slate-400" />
                            {referee.name}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {referee.qualificationTags.length > 0 ? (
                              referee.qualificationTags.map((tag) => (
                                <span key={`${referee.id}-${tag}`} className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-400">Nog geen kwalificaties</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={clsx("rounded-full px-2.5 py-1 text-xs font-semibold", qualificationStyles[qualificationState])}>
                            {qualificationState}
                          </span>
                          {isSelected && <Check size={16} className="text-dia-green" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Acties</h3>

              <div className="mt-4 flex flex-wrap gap-3">
                <button type="button" onClick={handleSave} disabled={saving || !opponent.trim()} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-dia-green px-5 py-3 text-sm font-semibold text-white transition hover:bg-dia-green-light disabled:bg-slate-300">
                  <Save size={16} />
                  {saving ? "Opslaan..." : "Opslaan"}
                </button>
                <button type="button" onClick={resetFields} className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50">
                  Annuleren
                </button>
              </div>

              {match.status === "scheduled" && (
                <div className="mt-5 space-y-4 border-t border-slate-100 pt-5">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600">Speler toevoegen</label>
                    <div className="flex gap-2">
                      <select
                        value={addPlayerId}
                        onChange={(event) => setAddPlayerId(event.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-dia-green"
                      >
                        <option value="">Bestaande speler selecteren...</option>
                        {playersNotInMatch?.map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.number ? `${player.number}. ` : ""}
                            {player.name}
                          </option>
                        ))}
                      </select>
                      <button type="button" onClick={handleAddPlayer} disabled={!addPlayerId} className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:text-slate-300">
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium text-slate-600">Nieuwe speler</label>
                    <div className="grid gap-2 sm:grid-cols-[1fr_88px_auto]">
                      <input
                        type="text"
                        value={newPlayerName}
                        onChange={(event) => setNewPlayerName(event.target.value)}
                        placeholder="Naam nieuwe speler"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-dia-green"
                      />
                      <input
                        type="number"
                        value={newPlayerNumber}
                        onChange={(event) => setNewPlayerNumber(event.target.value)}
                        placeholder="Nr"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-dia-green"
                      />
                      <button type="button" onClick={handleCreatePlayer} disabled={!newPlayerName.trim()} className="inline-flex min-h-[48px] items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:text-slate-300">
                        Maak aan
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-5 border-t border-slate-100 pt-5">
                {!confirmDelete ? (
                  <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50">
                    <Trash2 size={16} />
                    Wedstrijd verwijderen
                  </button>
                ) : (
                  <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold">Weet je het zeker?</p>
                        <p className="mt-1">Spelers en events van deze wedstrijd worden ook verwijderd.</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button type="button" onClick={handleDelete} className="rounded-2xl bg-red-600 px-4 py-2 font-semibold text-white">
                        Ja, verwijderen
                      </button>
                      <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-2xl border border-red-200 px-4 py-2 font-semibold text-red-700">
                        Nee
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </aside>
    </>
  );
}
