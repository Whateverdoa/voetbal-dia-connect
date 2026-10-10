"use client";

import { useMemo } from "react";
import type { Match } from "@/components/match";
import { PlanAddForm } from "@/components/match/plan/PlanAddForm";
import { PlanRowList } from "@/components/match/plan/PlanRowList";
import { useSubstitutionPlanActions } from "@/hooks/useSubstitutionPlanActions";
import { projectSubstitutionPlan } from "@/lib/substitutions/projectSubstitutionPlan";

/**
 * Compact planning and execution using the same form, projection and mutations.
 */
export function CoachWisselplanMobile({
  match,
  canExecute,
  canEditPlan,
}: {
  match: Match;
  canExecute: boolean;
  canEditPlan: boolean;
}) {
  const plans = useMemo(() => match.substitutionPlans ?? [], [match.substitutionPlans]);
  const canEdit = canEditPlan && match.status !== "finished";
  const actions = useSubstitutionPlanActions(match._id);
  const pending = plans.filter((plan) => plan.status === "pending");
  const done = plans.filter((plan) => plan.status !== "pending");
  const canPressExecute =
    (match.status === "live" || match.status === "halftime") && canExecute;

  const projection = useMemo(
    () => projectSubstitutionPlan(match.players, plans, match.currentQuarter),
    [match.currentQuarter, match.players, plans]
  );
  const warningByPlanId = useMemo(
    () => new Map(projection.warnings.map((warning) => [String(warning.planId), warning.message])),
    [projection.warnings]
  );

  return (
    <section className="space-y-3 rounded-xl bg-white p-4 shadow-md">
      <h2 className="text-lg font-bold text-gray-900">Wisselplan</h2>
      <p className="text-sm text-gray-600">
        Plan je wissels met de spelerslijst. Tijdens de wedstrijd kun je ze
        hier uitvoeren. Uitgebreid plannen op het veld kan op iPad of laptop.
      </p>
      {actions.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {actions.error}
        </div>
      ) : null}
      {canEdit ? (
        <details className="rounded-xl border border-gray-200 p-3">
          <summary className="flex min-h-[44px] cursor-pointer items-center font-semibold text-dia-green">
            Wissel plannen
          </summary>
          <PlanAddForm
            quarterCount={match.quarterCount}
            regulationDurationMinutes={match.regulationDurationMinutes ?? 60}
            projectedOnField={projection.projectedOnField}
            projectedBench={projection.projectedBench}
            isBusy={actions.busy !== null}
            onAdd={actions.addFromForm}
          />
        </details>
      ) : null}
      <PlanRowList
        pending={pending}
        done={done}
        quarterCount={match.quarterCount}
        regulationDurationMinutes={match.regulationDurationMinutes ?? 60}
        warningByPlanId={warningByPlanId}
        canEditPlan={canEdit}
        canPressExecute={canPressExecute}
        isBusy={actions.busy !== null}
        onUpdateTiming={canEdit ? actions.updateTiming : undefined}
        onRemove={(planId) => void actions.remove(planId)}
        onSkip={(planId) => void actions.skip(planId)}
        onExecute={(planId) => void actions.execute(planId)}
      />
    </section>
  );
}
