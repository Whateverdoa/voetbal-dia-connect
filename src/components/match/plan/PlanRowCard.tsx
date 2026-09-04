"use client";

import { useEffect, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import type { SubstitutionPlanRow } from "@/components/match/types";
import { rowBadge, rowBadgeClass, rowLabel, timingLabel } from "./planLabels";
import {
  periodChipLabel,
  suggestPeriodFromMinute,
} from "@/lib/substitutions/suggestPeriodFromMinute";

interface PlanRowCardProps {
  row: SubstitutionPlanRow;
  displayIndex: number;
  quarterCount: number;
  regulationDurationMinutes?: number;
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

/** Compact pending plan row: names + timing + actions. */
export function PlanRowCard({
  row,
  displayIndex,
  quarterCount,
  regulationDurationMinutes = 60,
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

  const parsedMinute = (() => {
    const trimmed = minuteDraft.trim();
    if (trimmed === "") return null;
    const value = Number(trimmed);
    if (!Number.isFinite(value) || value < 0) return null;
    return value;
  })();

  const suggestedQuarter =
    parsedMinute != null
      ? suggestPeriodFromMinute(
          parsedMinute,
          quarterCount,
          regulationDurationMinutes
        )
      : null;

  const minuteDirty =
    parsedMinute != null && parsedMinute !== row.targetMinute;
  const canSaveMinute = minuteDirty;
  const canSaveSuggestedHalf =
    suggestedQuarter != null && suggestedQuarter !== row.targetQuarter;

  const saveMinute = async () => {
    if (!onUpdateTiming || parsedMinute == null || !minuteDirty) return;
    const timing: { targetMinute: number; targetQuarter?: number } = {
      targetMinute: parsedMinute,
    };
    // Also store the implied half/quarter when still missing.
    if (row.targetQuarter == null && suggestedQuarter != null) {
      timing.targetQuarter = suggestedQuarter;
    }
    await onUpdateTiming(row._id, timing);
  };

  const savePeriod = async (period: number) => {
    if (!onUpdateTiming || row.targetQuarter === period) return;
    const timing: { targetQuarter: number; targetMinute?: number } = {
      targetQuarter: period,
    };
    if (parsedMinute != null) timing.targetMinute = parsedMinute;
    await onUpdateTiming(row._id, timing);
  };

  const saveSuggestedHalf = async () => {
    if (!onUpdateTiming || suggestedQuarter == null) return;
    const timing: { targetQuarter: number; targetMinute?: number } = {
      targetQuarter: suggestedQuarter,
    };
    if (parsedMinute != null) timing.targetMinute = parsedMinute;
    await onUpdateTiming(row._id, timing);
  };

  return (
    <div className="border border-gray-200 rounded-xl p-2.5 flex flex-col gap-2">
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex min-w-0 items-start gap-2">
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${rowBadgeClass(row)}`}
          >
            {rowBadge(row)}
          </span>
          <p className="min-w-0 flex-1 text-sm font-semibold leading-snug break-words">
            {displayIndex}. {rowLabel(row)}
          </p>
        </div>
        <span className="pl-0.5 text-xs font-medium tabular-nums text-gray-500">
          {timingLabel(row, quarterCount)}
        </span>
      </div>

      {canEditPlan || canPressExecute ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {canEditPlan && onUpdateTiming ? (
            <>
              <div
                className="flex gap-1"
                role="group"
                aria-label={
                  quarterCount === 2
                    ? "Helft opslaan"
                    : "Kwart opslaan"
                }
              >
                {Array.from({ length: quarterCount }, (_, i) => i + 1).map(
                  (period) => {
                    const active = row.targetQuarter === period;
                    return (
                      <button
                        key={period}
                        type="button"
                        disabled={isBusy}
                        onClick={() => void savePeriod(period)}
                        className={`min-h-[44px] min-w-[44px] rounded-lg px-2 text-sm font-semibold disabled:opacity-50 ${
                          active
                            ? "bg-dia-green text-white"
                            : "border border-gray-200 bg-white text-gray-700"
                        }`}
                      >
                        {periodChipLabel(period, quarterCount)}
                      </button>
                    );
                  }
                )}
              </div>
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
                disabled={isBusy || !canSaveMinute}
                onClick={() => void saveMinute()}
                className="shrink-0 rounded-lg border border-dia-green bg-dia-green/20 px-2.5 text-sm font-semibold min-h-[44px] disabled:opacity-50"
              >
                Minuut opslaan
              </button>
              {canSaveSuggestedHalf ? (
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => void saveSuggestedHalf()}
                  className="shrink-0 rounded-lg bg-dia-green px-2.5 text-sm font-semibold text-white min-h-[44px] disabled:opacity-50"
                >
                  Ook {periodChipLabel(suggestedQuarter!, quarterCount)}
                </button>
              ) : null}
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
              className="shrink-0 rounded-lg bg-dia-green px-2.5 text-sm font-semibold text-white min-h-[44px]"
            >
              Wissel uitvoeren
            </button>
          ) : null}
        </div>
      ) : null}

      {canEditPlan && onUpdateTiming ? (
        <p className="text-xs text-gray-500">
          H1/H2 = helft in het plan zetten (nog geen echte wissel).
          {canSaveSuggestedHalf
            ? ` Minuut ${parsedMinute} hoort bij ${periodChipLabel(suggestedQuarter!, quarterCount)}.`
            : ""}
          {!canPressExecute
            ? " Tijdens de wedstrijd verschijnt “Wissel uitvoeren”."
            : ""}
        </p>
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
