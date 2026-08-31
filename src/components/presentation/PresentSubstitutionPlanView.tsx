"use client";

import { useMemo, useState } from "react";
import type { Formation } from "@/lib/formations/types";
import { projectSubstitutionPlan } from "@/lib/substitutions/projectSubstitutionPlan";
import {
  presentRowLabel,
  timingLabel,
  toMatchPlayers,
  toPlanRows,
  type PresentPlanPlayer,
  type PresentPlanRow,
} from "@/lib/substitutions/presentPlanAdapters";
import { PresentationPitchView } from "./PresentationPitchView";

interface PresentSubstitutionPlanViewProps {
  players: PresentPlanPlayer[];
  plans: PresentPlanRow[];
  quarterCount: number;
  formationId: string | undefined;
  resolvedFormation: Formation | undefined;
  customFormationKind?: "8v8" | "11v11";
}

/** Read-only wisselplan for kleedkamer / TV presentation. */
export function PresentSubstitutionPlanView({
  players,
  plans,
  quarterCount,
  formationId,
  resolvedFormation,
  customFormationKind,
}: PresentSubstitutionPlanViewProps) {
  const [selectedQuarter, setSelectedQuarter] = useState(1);

  const matchPlayers = useMemo(() => toMatchPlayers(players), [players]);
  const planRows = useMemo(() => toPlanRows(plans), [plans]);
  const projection = useMemo(
    () => projectSubstitutionPlan(matchPlayers, planRows, selectedQuarter),
    [matchPlayers, planRows, selectedQuarter]
  );

  const pending = plans
    .filter((plan) => plan.status === "pending")
    .sort(
      (a, b) =>
        a.sequence - b.sequence || String(a._id).localeCompare(String(b._id))
    );

  const previewPlayers = useMemo(() => {
    const source =
      projection.quarterPreview?.projectedOnField ?? projection.projectedOnField;
    const byId = new Map(players.map((player) => [player.playerId, player]));
    return source.map((player) => {
      const original = byId.get(String(player.playerId));
      return {
        playerId: String(player.playerId),
        displayName: player.name,
        number: player.number ?? null,
        onField: true,
        fieldSlotIndex: player.fieldSlotIndex ?? null,
        photoUrl: original?.photoUrl ?? null,
        position: player.positionPrimary,
      };
    });
  }, [players, projection]);

  if (pending.length === 0) {
    return (
      <div className="rounded-xl bg-slate-800/80 p-8 text-center text-slate-300">
        <p className="text-lg font-semibold text-white">Geen openstaande wissels</p>
        <p className="mt-2 text-sm">
          Zodra de coach een wissel plant, verschijnt die hier realtime.
        </p>
      </div>
    );
  }

  const period = quarterCount === 2 ? "helft" : "kwart";

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-slate-800/80 p-4">
        <h2 className="text-xl font-bold text-white mb-3">Te volgen wisselplan</h2>
        <ul className="space-y-2">
          {pending.map((row) => (
            <li
              key={String(row._id)}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg bg-slate-900/70 px-4 py-3"
            >
              <div>
                <span className="text-xs uppercase tracking-wide text-dia-yellow">
                  {row.kind === "positionSwap" ? "Positiewissel" : "Wissel"}
                </span>
                <p className="text-lg font-semibold text-white">
                  {presentRowLabel(row)}
                </p>
                {row.note ? (
                  <p className="text-sm text-slate-400">{row.note}</p>
                ) : null}
              </div>
              <span className="text-sm font-medium text-slate-300">
                {timingLabel(row, quarterCount)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-slate-400">Preview {period}:</span>
        {Array.from({ length: quarterCount }, (_, index) => index + 1).map(
          (quarter) => (
            <button
              key={quarter}
              type="button"
              onClick={() => setSelectedQuarter(quarter)}
              className={`min-h-[44px] rounded-lg px-4 py-2 font-semibold ${
                selectedQuarter === quarter
                  ? "bg-dia-black text-dia-yellow ring-2 ring-dia-yellow"
                  : "bg-dia-yellow text-black"
              }`}
            >
              {quarterCount === 2 ? `H${quarter}` : `K${quarter}`}
            </button>
          )
        )}
      </div>

      {resolvedFormation ? (
        <PresentationPitchView
          players={previewPlayers}
          formationId={formationId}
          resolvedFormation={resolvedFormation}
          customFormationKind={customFormationKind}
        />
      ) : (
        <p className="text-center text-slate-400 py-8">
          Geen formatie — alleen de wissel-lijst is beschikbaar.
        </p>
      )}

      {projection.quarterPreview &&
      projection.quarterPreview.warnings.length > 0 ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-950/40 px-4 py-3 text-sm text-amber-100">
          {Array.from(
            new Set(
              projection.quarterPreview.warnings.map((warning) => warning.message)
            )
          ).join(" · ")}
        </div>
      ) : null}
    </div>
  );
}
