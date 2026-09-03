"use client";

import { useEffect, useMemo, useState } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import type { Formation } from "@/lib/formations/types";
import { projectSubstitutionPlan } from "@/lib/substitutions/projectSubstitutionPlan";
import { useSubstitutionPlanActions } from "@/hooks/useSubstitutionPlanActions";
import { useSeasonMinutesMap } from "@/hooks/useSeasonMinutesMap";
import { useShowCardMinutes } from "@/hooks/useShowCardMinutes";
import { CardMinutesToggle } from "@/components/coach/CardMinutesToggle";
import { FormationSelector } from "@/components/match/FormationSelector";
import { ProjectedPitchPlanner } from "./ProjectedPitchPlanner";
import { PlanAddForm } from "./plan/PlanAddForm";
import { PlanBenchSummary } from "./plan/PlanBenchSummary";
import { PlanRowList } from "./plan/PlanRowList";
import type {
  MatchPlayer,
  MatchStatus,
  SubstitutionPlanRow,
} from "./types";

type PlannerMode = "list" | "field";

interface SubstitutionPlanPanelProps {
  matchId: Id<"matches">;
  teamId: Id<"teams">;
  status: MatchStatus;
  quarterCount: number;
  plans: SubstitutionPlanRow[];
  players: MatchPlayer[];
  formationId?: string;
  customFormationTemplateId?: Id<"formationTemplates">;
  resolvedFormation: Formation | undefined;
  canEditPlan: boolean;
  canExecute: boolean;
}

export function SubstitutionPlanPanel({
  matchId,
  teamId,
  status,
  quarterCount,
  plans,
  players,
  formationId,
  customFormationTemplateId,
  resolvedFormation,
  canEditPlan,
  canExecute,
}: SubstitutionPlanPanelProps) {
  const actions = useSubstitutionPlanActions(matchId);
  const seasonMinutesByPlayerId = useSeasonMinutesMap(teamId);
  const [showCardMinutes, setShowCardMinutes] = useShowCardMinutes();
  const cardMinutes = showCardMinutes ? seasonMinutesByPlayerId : undefined;
  const [mode, setMode] = useState<PlannerMode>("list");
  const [selectedQuarter, setSelectedQuarter] = useState(1);

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
  const fieldBusy =
    actions.busy === "field-add" || actions.busy === "field-swap";

  return (
    <section className="bg-white rounded-xl shadow-md p-4 space-y-4">
      <h2 className="font-bold text-lg">Wisselplan</h2>
      <p className="text-sm text-gray-600">
        Plan wissels van tevoren. Tijdens de wedstrijd bevestig je ze hier;
        blessurewissels blijven mogelijk via de normale wisselknop.
      </p>

      <CardMinutesToggle
        enabled={showCardMinutes}
        onChange={setShowCardMinutes}
      />

      {canEditPlan ? (
        <FormationSelector
          matchId={matchId}
          teamId={teamId}
          formationId={formationId}
          customFormationTemplateId={customFormationTemplateId}
          canEdit={canEditPlan}
          showLineupToggle={false}
        />
      ) : null}

      {actions.error ? (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          {actions.error}
        </div>
      ) : null}

      <PlanBenchSummary
        startingBench={projection.startingBench}
        projectedBench={projection.projectedBench}
      />

      <div className="flex rounded-lg overflow-hidden border border-gray-300">
        <button
          type="button"
          onClick={() => setMode("list")}
          className={`flex-1 px-3 py-2 text-sm font-medium ${
            mode === "list"
              ? "bg-dia-black text-dia-yellow"
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
              ? "bg-dia-black text-dia-yellow"
              : "bg-gray-100 text-gray-700"
          }`}
        >
          Planweergave
        </button>
      </div>

      {!resolvedFormation ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-3 text-sm text-gray-600">
          Kies hierboven een formatie om Planweergave op het veld te gebruiken.
        </div>
      ) : null}

      {mode === "list" && canEditPlan ? (
        <PlanAddForm
          quarterCount={quarterCount}
          projectedOnField={projection.projectedOnField}
          projectedBench={projection.projectedBench}
          isBusy={actions.busy === "add"}
          onAdd={async (payload) => {
            const ok = await actions.addFromForm(payload);
            if (ok && payload.targetQuarter != null) {
              setSelectedQuarter(payload.targetQuarter);
              setMode("field");
            }
            return ok;
          }}
        />
      ) : null}

      {mode === "field" && resolvedFormation && projection.quarterPreview ? (
        <ProjectedPitchPlanner
          formation={resolvedFormation}
          quarterCount={quarterCount}
          selectedQuarter={selectedQuarter}
          onQuarterChange={setSelectedQuarter}
          preview={projection.quarterPreview}
          quarterlessPendingCount={projection.quarterlessPendingRows.length}
          canEdit={canEditPlan}
          isBusy={fieldBusy}
          seasonMinutesByPlayerId={cardMinutes}
          onCreatePlan={(outId, inId, minute) =>
            actions.addSubstitution(outId, inId, selectedQuarter, minute)
          }
          onCreatePositionSwap={(aId, bId, minute) =>
            actions.addPositionSwap(aId, bId, selectedQuarter, minute)
          }
        />
      ) : null}

      <PlanRowList
        pending={pending}
        done={done}
        quarterCount={quarterCount}
        warningByPlanId={warningByPlanId}
        canEditPlan={canEditPlan}
        canPressExecute={canPressExecute}
        isBusy={actions.busy !== null}
        onRemove={(planId) => void actions.remove(planId)}
        onSkip={(planId) => void actions.skip(planId)}
        onExecute={(planId) => void actions.execute(planId)}
        onUpdateTiming={canEditPlan ? actions.updateTiming : undefined}
        onClearPending={canEditPlan ? actions.clearPending : undefined}
      />
    </section>
  );
}
