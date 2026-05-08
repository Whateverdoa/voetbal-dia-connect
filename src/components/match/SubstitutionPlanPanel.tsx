"use client";

import { useMemo, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { createCorrelationId } from "@/lib/correlationId";
import { projectSubstitutionPlan } from "@/lib/substitutions/projectSubstitutionPlan";
import type { MatchPlayer, MatchStatus, SubstitutionPlanRow } from "./types";

interface SubstitutionPlanPanelProps {
  matchId: Id<"matches">;
  status: MatchStatus;
  quarterCount: number;
  plans: SubstitutionPlanRow[];
  players: MatchPlayer[];
  canEditPlan: boolean;
  canExecute: boolean;
}

export function SubstitutionPlanPanel({
  matchId,
  status,
  quarterCount,
  plans,
  players,
  canEditPlan,
  canExecute,
}: SubstitutionPlanPanelProps) {
  const addPlanItem = useMutation(api.substitutionPlans.addPlanItem);
  const skipPlanItem = useMutation(api.substitutionPlans.skipPlanItem);
  const executePlanItem = useMutation(api.substitutionPlans.executePlanItem);
  const removePlanItem = useMutation(api.substitutionPlans.removePlanItem);

  const [playerOut, setPlayerOut] = useState<Id<"players"> | "">("");
  const [playerIn, setPlayerIn] = useState<Id<"players"> | "">("");
  const [targetQuarter, setTargetQuarter] = useState("");
  const [targetMinute, setTargetMinute] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const projection = useMemo(
    () => projectSubstitutionPlan(players, plans),
    [players, plans]
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

  const handleAdd = async () => {
    if (!playerOut || !playerIn) return;
    setError(null);
    try {
      setBusy("add");
      await addPlanItem({
        matchId,
        playerOutId: playerOut,
        playerInId: playerIn,
        targetQuarter: targetQuarter ? Number(targetQuarter) : undefined,
        targetMinute: targetMinute ? Number(targetMinute) : undefined,
        note: note.trim() || undefined,
      });
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

  const pending = plans.filter((p) => p.status === "pending");
  const done = plans.filter((p) => p.status !== "pending");
  const sortedPending = [...pending].sort((a, b) => a.sequence - b.sequence);

  const names = (list: MatchPlayer[]) =>
    list.length === 0 ? "geen" : list.map((player) => player.name).join(", ");

  const timingLabel = (row: SubstitutionPlanRow): string => {
    if (row.targetMinute != null) return `min ~${row.targetMinute}`;
    if (row.targetQuarter != null) return `start kwart ${row.targetQuarter}`;
    return "start van kwart";
  };

  return (
    <section className="bg-white rounded-xl shadow-md p-4 space-y-4">
      <h2 className="font-bold text-lg">Wisselplan</h2>
      <p className="text-sm text-gray-600">
        Plan wissels van tevoren. Tijdens de wedstrijd bevestig je ze hier; blessurewissels blijven mogelijk via
        de normale wisselknop.
      </p>
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      )}

      <div className="grid gap-2 text-sm">
        <div className="rounded-xl bg-gray-50 p-3">
          <span className="font-semibold">Bank bij aftrap:</span>{" "}
          {names(projection.startingBench)}
        </div>
        <div className="rounded-xl bg-blue-50 p-3 text-blue-900">
          <span className="font-semibold">Virtuele bank na openstaand plan:</span>{" "}
          {names(projection.projectedBench)}
        </div>
      </div>

      {canEditPlan && (
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
              {projection.projectedOnField.map((p) => (
                <option key={String(p.playerId)} value={String(p.playerId)}>
                  {p.name}
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
              {projection.projectedBench.map((p) => (
                <option key={String(p.playerId)} value={String(p.playerId)}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-600">Kwart (optioneel)</label>
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
              <div className="font-medium text-sm">
                {row.sequence + 1}. {row.outName ?? "?"} → {row.inName ?? "?"}
              </div>
              <p className="text-xs text-gray-600">Doel: {timingLabel(row)}</p>
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
                {row.outName} → {row.inName}{" "}
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
