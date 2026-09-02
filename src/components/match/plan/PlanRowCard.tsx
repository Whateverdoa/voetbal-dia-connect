"use client";

import { useEffect, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import type { SubstitutionPlanRow } from "@/components/match/types";
import { rowBadge, rowBadgeClass, rowLabel, timingLabel } from "./planLabels";

interface PlanRowCardProps {
  row: SubstitutionPlanRow;
  displayIndex: number;
  quarterCount: number;
  warning?: string;
  canEditPlan: boolean;
  canPressExecute: boolean;
  isBusy: boolean;
  onRemove: (planId: Id<"substitutionPlans">) => void;
  onSkip: (planId: Id<"substitutionPlans">) => void;
  onExecute: (planId: Id<"substitutionPlans">) => void;
  onUpdateTiming?: (
    planId: Id<"substitutionPlans">,
    timing: { targetMinute?: number; targetQuarter?: number }
  ) => Promise<boolean>;
}

/** Compact pending plan row: names + one action row. */
export function PlanRowCard({
  row,
  displayIndex,
  quarterCount,
  warning,
  canEditPlan,
  canPressExecute,
  isBusy,
  onRemove,
  onSkip,
  onExecute,
  onUpdateTiming,
}: PlanRowCardProps) {
  const [minuteDraft, setMinuteDraft] = useState(
    row.targetMinute != null ? String(row.targetMinute) : ""
  );

  useEffect(() => {
    setMinuteDraft(row.targetMinute != null ? String(row.targetMinute) : "");
  }, [row.targetMinute, row._id]);

  const saveMinute = async () => {
    if (!onUpdateTiming) return;
    const trimmed = minuteDraft.trim();
    if (trimmed === "") return;
    const value = Number(trimmed);
    if (!Number.isFinite(value) || value < 0) return;
    if (row.targetMinute === value) return;
    await onUpdateTiming(row._id, { targetMinute: value });
  };

  return (
    <div className="border border-gray-200 rounded-xl p-2.5 flex flex-col gap-2">
      <div className="flex min-w-0 items-baseline gap-2">
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${rowBadgeClass(row)}`}
        >
          {rowBadge(row)}
        </span>
        <p className="min-w-0 truncate text-sm font-medium">
          {displayIndex}. {rowLabel(row)}
        </p>
        <span className="ml-auto shrink-0 text-xs text-gray-500">
          {timingLabel(row, quarterCount)}
        </span>
      </div>

      {canEditPlan || canPressExecute ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {canEditPlan && onUpdateTiming ? (
            <>
              <label className="sr-only" htmlFor={`plan-min-${row._id}`}>
                Wedstrijdminuut
              </label>
              <input
                id={`plan-min-${row._id}`}
                type="number"
                min={0}
                value={minuteDraft}
                disabled={isBusy}
                onChange={(e) => setMinuteDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void saveMinute();
                  }
                }}
                placeholder="min"
                className="w-16 shrink-0 rounded-lg border px-2 text-sm min-h-[44px]"
              />
              <button
                type="button"
                disabled={isBusy || minuteDraft.trim() === ""}
                onClick={() => void saveMinute()}
                className="shrink-0 rounded-lg border border-dia-green bg-dia-green/20 px-2.5 text-sm font-semibold min-h-[44px] disabled:opacity-50"
              >
                Zetten
              </button>
            </>
          ) : null}
          {canEditPlan ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onRemove(row._id)}
              className="shrink-0 rounded-lg border px-2.5 text-sm min-h-[44px]"
            >
              Verwijderen
            </button>
          ) : null}
          {canEditPlan ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onSkip(row._id)}
              className="shrink-0 rounded-lg border border-amber-300 px-2.5 text-sm min-h-[44px]"
            >
              Overslaan
            </button>
          ) : null}
          {canPressExecute ? (
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onExecute(row._id)}
              className="shrink-0 rounded-lg bg-dia-green px-2.5 text-sm font-semibold text-black min-h-[44px]"
            >
              Bevestigen
            </button>
          ) : null}
        </div>
      ) : null}

      {warning ? (
        <p className="rounded-lg bg-amber-50 p-2 text-xs font-medium text-amber-800">
          {warning}
        </p>
      ) : null}
      {row.note ? <p className="text-xs text-gray-600">{row.note}</p> : null}
    </div>
  );
}
