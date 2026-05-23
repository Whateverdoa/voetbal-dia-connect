"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { Formation } from "@/lib/formations/types";
import { createCorrelationId } from "@/lib/correlationId";
import { projectSubstitutionPlan } from "@/lib/substitutions/projectSubstitutionPlan";
import { ProjectedPitchPlanner } from "./ProjectedPitchPlanner";
import type {
  MatchPlayer,
  MatchStatus,
  SubstitutionPlanKind,
  SubstitutionPlanRow,
} from "./types";

type PlannerMode = "list" | "field";

interface SubstitutionPlanPanelProps {
  matchId: Id<"matches">;
  status: MatchStatus;
  quarterCount: number;
  plans: SubstitutionPlanRow[];
  players: MatchPlayer[];
  resolvedFormation: Formation | undefined;
  canEditPlan: boolean;
  canExecute: boolean;
}

function names(players: MatchPlayer[]): string {
  return players.length === 0 ? "geen" : players.map((player) => player.name).join(", ");
}

function periodWord(quarterCount: number): string {
  return quarterCount === 2 ? "helft" : "kwart";
}

function timingLabel(row: SubstitutionPlanRow, quarterCount: number): string {
  const period = periodWord(quarterCount);
  if (row.targetQuarter != null && row.targetMinute != null) {
    return `${period} ${row.targetQuarter} · min ~${row.targetMinute}`;
  }
  if (row.targetQuarter != null) {
    return `start ${period} ${row.targetQuarter}`;
  }
  if (row.targetMinute != null) {
    return `min ~${row.targetMinute}`;
  }
  return `start ${period}`;
}

function rowKind(row: SubstitutionPlanRow): SubstitutionPlanKind {
  return row.kind ?? "substitution";
}

function rowLabel(row: SubstitutionPlanRow): string {
  const left = row.outName ?? "?";
  const right = row.inName ?? "?";
  return rowKind(row) === "positionSwap"
    ? `${left} ↔ ${right}`
    : `${left} → ${right}`;
}

function rowBadge(row: SubstitutionPlanRow): string {
  return rowKind(row) === "positionSwap" ? "Positiewissel" : "Wissel";
}

export function SubstitutionPlanPanel({
  matchId,
  status,
  quarterCount,
  plans,
  players,
  resolvedFormation,
  canEditPlan,
  canExecute,
}: SubstitutionPlanPanelProps) {
  const addPlanItem = useMutation(api.substitutionPlans.addPlanItem);
  const skipPlanItem = useMutation(api.substitutionPlans.skipPlanItem);
  const executePlanItem = useMutation(api.substitutionPlans.executePlanItem);
  const removePlanItem = useMutation(api.substitutionPlans.removePlanItem);

  const [mode, setMode] = useState<PlannerMode>("list");
  const [selectedQuarter, setSelectedQuarter] = useState(1);
  const [playerOut, setPlayerOut] = useState<Id<"players"> | "">("");
  const [playerIn, setPlayerIn] = useState<Id<"players"> | "">("");
  const [targetQuarter, setTargetQuarter] = useState("");
  const [targetMinute, setTargetMinute] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (selectedQuarter > quarterCount) {
      setSelectedQuarter(quarterCount);
    }
  }, [quarterCount, selectedQuarter]);

  useEffect(() => {
    if (!resolvedFormation && mode === "field") {
      setMode("list");
    }
  }, [mode, resolvedFormation]);

  const projection = useMemo(
    () => projectSubstitutionPlan(players, plans, selectedQuarter),
    [players, plans, selectedQuarter]
  );

  const warningByPlanId = useMemo(
    () =>
      new Map(
        projection.warnings.map((warning) => [
          String(warning.planId),
          warning.message,
        ])
      ),
    [projection.warnings]
  );

  const canPressExecute =
    (status === "live" || status === "halftime") && canExecute;
  const pending = plans.filter((plan) => plan.status === "pending");
  const done = plans.filter((plan) => plan.status !== "pending");
  const sortedPending = [...pending].sort(
    (a, b) => a.sequence - b.sequence || String(a._id).localeCompare(String(b._id))
  );

  const handleAdd = async () => {
    if (!playerOut || !playerIn) return;
    setError(null);
    const normalizedQuarter = targetQuarter ? Number(targetQuarter) : undefined;
    const normalizedMinute = targetMinute ? Number(targetMinute) : undefined;
    const payload: Parameters<typeof addPlanItem>[0] = {
      matchId,
      playerOutId: playerOut,
      playerInId: playerIn,
      insertAtQuarterBoundary: normalizedQuarter !== undefined,
    };

    if (normalizedQuarter !== undefined) {
      payload.targetQuarter = normalizedQuarter;
    }
    if (normalizedMinute !== undefined) {
      payload.targetMinute = normalizedMinute;
    }
    if (note.trim()) {
      payload.note = note.trim();
    }

    try {
      setBusy("add");
      await addPlanItem(payload);
      setPlayerOut("");
      setPlayerIn("");
      setTargetQuarter("");
      setTargetMinute("");
      setNote("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fout");
    } finally {
      setBusy(null);
    }
  };

  const handleFieldCreatePlan = async (
    playerOutId: Id<"players">,
    playerInId: Id<"players">
  ): Promise<boolean> => {
    setError(null);
    const payload: Parameters<typeof addPlanItem>[0] = {
      matchId,
      playerOutId,
      playerInId,
      targetQuarter: selectedQuarter,
      insertAtQuarterBoundary: true,
    };
    try {
      setBusy("field-add");
      await addPlanItem(payload);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fout");
      return false;
    } finally {
      setBusy(null);
    }
  };

  const handleFieldCreatePositionSwap = async (
    playerAId: Id<"players">,
    playerBId: Id<"players">
  ): Promise<boolean> => {
    setError(null);
    const payload: Parameters<typeof addPlanItem>[0] = {
      matchId,
      playerOutId: playerAId,
      playerInId: playerBId,
      kind: "positionSwap",
      targetQuarter: selectedQuarter,
      insertAtQuarterBoundary: true,
    };
    try {
      setBusy("field-swap");
      await addPlanItem(payload);
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fout");
      return false;
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="bg-white rounded-xl shadow-md p-4 space-y-4">
      <h2 className="font-bold text-lg">Wisselplan</h2>
      <p className="text-sm text-gray-600">
        Plan wissels van tevoren. Tijdens de wedstrijd bevestig je ze hier;
        blessurewissels blijven mogelijk via de normale wisselknop.
      </p>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-2 text-sm">
        <div className="rounded-xl bg-gray-50 p-3">
          <span className="font-semibold">Bank bij aftrap:</span>{" "}
          {names(projection.startingBench)}
        </div>
        <div className="rounded-xl bg-blue-50 p-3 text-blue-900">
          <span className="font-semibold">Virtuele bank volgens openstaand plan:</span>{" "}
          {names(projection.projectedBench)}
        </div>
      </div>

      <div className="flex rounded-lg overflow-hidden border border-gray-300">
        <button
          type="button"
          onClick={() => setMode("list")}
          className={`flex-1 px-3 py-2 text-sm font-medium ${
            mode === "list"
              ? "bg-dia-green text-white"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          Lijst
        </button>
        <button
          type="button"
          disabled={!resolvedFormation}
          onClick={() => setMode("field")}
          className={`flex-1 px-3 py-2 text-sm font-medium disabled:opacity-50 ${
            mode === "field"
              ? "bg-dia-green text-white"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          Planweergave
        </button>
      </div>

      {!resolvedFormation && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-600">
          Kies eerst een formatie om Planweergave op het veld te gebruiken.
        </div>
      )}

      {mode === "list" && canEditPlan && (
        <div className="border border-gray-200 rounded-xl p-3 space-y-2">
          <p className="text-sm font-semibold">Regel toevoegen</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <select
              value={playerOut === "" ? "" : String(playerOut)}
              onChange={(e) =>
                setPlayerOut(
                  e.target.value === "" ? "" : (e.target.value as Id<"players">)
                )
              }
              className="px-3 py-2 border rounded-lg text-sm min-h-[44px]"
            >
              <option value="">Eruit (veld)</option>
              {projection.projectedOnField.map((player) => (
                <option
                  key={String(player.playerId)}
                  value={String(player.playerId)}
                >
                  {player.name}
                </option>
              ))}
            </select>
            <select
              value={playerIn === "" ? "" : String(playerIn)}
              onChange={(e) =>
                setPlayerIn(
                  e.target.value === "" ? "" : (e.target.value as Id<"players">)
                )
              }
              className="px-3 py-2 border rounded-lg text-sm min-h-[44px]"
            >
              <option value="">Erin (bank)</option>
              {projection.projectedBench.map((player) => (
                <option
                  key={String(player.playerId)}
                  value={String(player.playerId)}
                >
                  {player.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-600">
                {quarterCount === 2 ? "Helft (optioneel)" : "Kwart (optioneel)"}
              </label>
              <input
                type="number"
                min={1}
                max={quarterCount}
                value={targetQuarter}
                onChange={(e) => setTargetQuarter(e.target.value)}
                className="w-full px-2 py-2 border rounded-lg text-sm"
                placeholder={`1–${quarterCount}`}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Wedstrijdminuut (optioneel)</label>
              <input
                type="number"
                min={0}
                value={targetMinute}
                onChange={(e) => setTargetMinute(e.target.value)}
                className="w-full px-2 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
          <p className="text-xs text-gray-500">
            Laat de minuut leeg voor start van {periodWord(quarterCount)}.
          </p>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Notitie (optioneel)"
            className="w-full px-3 py-2 border rounded-lg text-sm"
          />
          <button
            type="button"
            disabled={!playerOut || !playerIn || busy !== null}
            onClick={() => void handleAdd()}
            className="w-full py-3 bg-dia-green text-white rounded-xl font-semibold min-h-[48px] disabled:opacity-50"
          >
            {busy === "add" ? "Bezig..." : "Toevoegen aan plan"}
          </button>
        </div>
      )}

      {mode === "field" && resolvedFormation && projection.quarterPreview && (
        <ProjectedPitchPlanner
          formation={resolvedFormation}
          quarterCount={quarterCount}
          selectedQuarter={selectedQuarter}
          onQuarterChange={setSelectedQuarter}
          preview={projection.quarterPreview}
          quarterlessPendingCount={projection.quarterlessPendingRows.length}
          canEdit={canEditPlan}
          isBusy={busy === "field-add" || busy === "field-swap"}
          onCreatePlan={handleFieldCreatePlan}
          onCreatePositionSwap={handleFieldCreatePositionSwap}
        />
      )}

      <div className="space-y-2">
        <p className="text-sm font-semibold">Openstaand ({pending.length})</p>
        {pending.length === 0 ? (
          <p className="text-sm text-gray-500">Geen regels in het plan.</p>
        ) : (
          sortedPending.map((row) => (
            <div
              key={String(row._id)}
              className="border border-gray-200 rounded-xl p-3 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-700">
                  {rowBadge(row)}
                </span>
                <div className="font-medium text-sm">
                  {row.sequence + 1}. {rowLabel(row)}
                </div>
              </div>
              <p className="text-xs text-gray-600">
                Doel: {timingLabel(row, quarterCount)}
              </p>
              {warningByPlanId.has(String(row._id)) && (
                <p className="rounded-lg bg-amber-50 p-2 text-xs font-medium text-amber-800">
                  {warningByPlanId.get(String(row._id))}
                </p>
              )}
              {row.note && <p className="text-xs text-gray-600">{row.note}</p>}
              <div className="flex flex-wrap gap-2">
                {canEditPlan && (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => {
                      setBusy(String(row._id));
                      void removePlanItem({ planId: row._id }).finally(() =>
                        setBusy(null)
                      );
                    }}
                    className="flex-1 py-2 border rounded-lg text-sm min-h-[44px]"
                  >
                    Verwijderen
                  </button>
                )}
                {canEditPlan && (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => {
                      setBusy(String(row._id));
                      void skipPlanItem({ planId: row._id }).finally(() =>
                        setBusy(null)
                      );
                    }}
                    className="flex-1 py-2 border border-amber-300 rounded-lg text-sm min-h-[44px]"
                  >
                    Overslaan
                  </button>
                )}
                {canPressExecute && (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => {
                      setBusy(String(row._id));
                      void executePlanItem({
                        planId: row._id,
                        correlationId: createCorrelationId("plan-exec"),
                      }).finally(() => setBusy(null));
                    }}
                    className="flex-1 py-2 bg-dia-green text-white rounded-lg text-sm font-semibold min-h-[44px]"
                  >
                    Bevestigen
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {done.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-gray-700">
            Afgerond ({done.length})
          </summary>
          <ul className="mt-2 space-y-1 text-gray-600">
            {done.map((row) => (
              <li key={String(row._id)}>
                {rowLabel(row)}{" "}
                <span className="text-xs">
                  ({row.status === "executed" ? "gedaan" : "overgeslagen"})
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
