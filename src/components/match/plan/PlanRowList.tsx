"use client";

import { useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import type { SubstitutionPlanRow } from "@/components/match/types";
import { comparePlanTiming } from "@/lib/substitutions/comparePlanTiming";
import { rowLabel } from "./planLabels";
import { PlanRowCard } from "./PlanRowCard";

interface PlanRowListProps {
  pending: SubstitutionPlanRow[];
  done: SubstitutionPlanRow[];
  quarterCount: number;
  regulationDurationMinutes?: number;
  warningByPlanId: Map<string, string>;
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
  onClearPending?: () => Promise<boolean>;
}

/** Pending rows, optional clear button, and collapsible completed history. */
export function PlanRowList({
  pending,
  done,
  quarterCount,
  regulationDurationMinutes = 60,
  warningByPlanId,
  canEditPlan,
  canPressExecute,
  isBusy,
  onRemove,
  onSkip,
  onExecute,
  onUpdateTiming,
  onClearPending,
}: PlanRowListProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const sortedPending = [...pending].sort(comparePlanTiming);

  const handleClear = async () => {
    if (!onClearPending) return;
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    const ok = await onClearPending();
    if (ok) setConfirmClear(false);
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">Openstaand ({pending.length})</p>
      <p className="text-xs text-gray-500">
        Voor de wedstrijd: plan en helft/minuut opslaan. Na aftrap: “Wissel
        uitvoeren” om de wissel echt te doen.
      </p>
      {pending.length === 0 ? (
        <p className="text-sm text-gray-500">Geen regels in het plan.</p>
      ) : (
        sortedPending.map((row, index) => (
          <PlanRowCard
            key={String(row._id)}
            row={row}
            displayIndex={index + 1}
            quarterCount={quarterCount}
            regulationDurationMinutes={regulationDurationMinutes}
            warning={warningByPlanId.get(String(row._id))}
            canEditPlan={canEditPlan}
            canPressExecute={canPressExecute}
            isBusy={isBusy}
            onRemove={onRemove}
            onSkip={onSkip}
            onExecute={onExecute}
            onUpdateTiming={onUpdateTiming}
          />
        ))
      )}

      {canEditPlan && onClearPending ? (
        <div className="pt-1 space-y-1">
          <button
            type="button"
            disabled={pending.length === 0 || isBusy}
            onClick={() => void handleClear()}
            onBlur={() => setConfirmClear(false)}
            className="w-full min-h-[44px] rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800 disabled:opacity-50"
          >
            {confirmClear ? "Zeker weten? Tik opnieuw" : "Plan leegmaken"}
          </button>
          <p className="text-xs text-gray-500">
            Alleen openstaande regels verdwijnen. Uitgevoerde wissels blijven in
            de historie.
          </p>
        </div>
      ) : null}

      {done.length > 0 ? (
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
      ) : null}
    </div>
  );
}
