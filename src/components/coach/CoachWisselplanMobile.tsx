"use client";

import { useMemo } from "react";
import type { Match } from "@/components/match";
import { PlanRowList } from "@/components/match/plan/PlanRowList";
import { useSubstitutionPlanActions } from "@/hooks/useSubstitutionPlanActions";
import { projectSubstitutionPlan } from "@/lib/substitutions/projectSubstitutionPlan";

/**
 * Phone density of the same wisselplan: next rows + execute. No second editor.
 */
export function CoachWisselplanMobile({
  match,
  canExecute,
}: {
  match: Match;
  canExecute: boolean;
}) {
  const plans = match.substitutionPlans ?? [];
  const actions = useSubstitutionPlanActions(match._id);
  const pending = plans.filter((plan) => plan.status === "pending");
  const done = plans.filter((plan) => plan.status !== "pending");
  const canPressExecute =
    (match.status === "live" || match.status === "halftime") && canExecute;

  const warningByPlanId = useMemo(() => {
    const projection = projectSubstitutionPlan(
      match.players,
      plans,
      match.currentQuarter
    );
    return new Map(
      projection.warnings.map((warning) => [
        String(warning.planId),
        warning.message,
      ])
    );
  }, [match.currentQuarter, match.players, plans]);

  return (
    <section className="space-y-3 rounded-xl bg-white p-4 shadow-md">
      <h2 className="text-lg font-bold text-gray-900">Wisselplan</h2>
      <p className="text-sm text-gray-600">
        Volgende wissels. Uitvoeren doe je hier. Nieuw plannen op iPad of
        laptop.
      </p>
      {actions.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {actions.error}
        </div>
      ) : null}
      <PlanRowList
        pending={pending}
        done={done}
        quarterCount={match.quarterCount}
        regulationDurationMinutes={match.regulationDurationMinutes ?? 60}
        warningByPlanId={warningByPlanId}
        canEditPlan={false}
        canPressExecute={canPressExecute}
        isBusy={actions.busy !== null}
        onRemove={(planId) => void actions.remove(planId)}
        onSkip={(planId) => void actions.skip(planId)}
        onExecute={(planId) => void actions.execute(planId)}
      />
    </section>
  );
}
