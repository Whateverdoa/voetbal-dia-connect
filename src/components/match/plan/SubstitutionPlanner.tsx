"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Id } from "@/convex/_generated/dataModel";
import type { Formation } from "@/lib/formations/types";
import { projectSubstitutionPlan } from "@/lib/substitutions/projectSubstitutionPlan";
import { useSubstitutionPlanActions } from "@/hooks/useSubstitutionPlanActions";
import { useSeasonMinutesMap } from "@/hooks/useSeasonMinutesMap";
import { useShowCardMinutes } from "@/hooks/useShowCardMinutes";
import { ProjectedPitchPlanner } from "@/components/match/ProjectedPitchPlanner";
import { TeamSeasonMinutesPanel } from "@/components/coach/TeamSeasonMinutesPanel";
import { CardMinutesToggle } from "@/components/coach/CardMinutesToggle";
import { FormationSelector } from "@/components/match/FormationSelector";
import { PlanAddForm } from "@/components/match/plan/PlanAddForm";
import { PlanBenchSummary } from "@/components/match/plan/PlanBenchSummary";
import { PlanRowList } from "@/components/match/plan/PlanRowList";
import type {
  MatchPlayer,
  MatchStatus,
  SubstitutionPlanRow,
} from "@/components/match/types";

interface SubstitutionPlannerProps {
  matchId: Id<"matches">;
  teamId: Id<"teams">;
  publicCode: string;
  teamName: string;
  opponent: string;
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

/**
 * Wide planscherm: pitch left (sticky on desktop), plan list right.
 * Stacks pitch-first on phone.
 */
export function SubstitutionPlanner({
  matchId,
  teamId,
  publicCode,
  teamName,
  opponent,
  status,
  quarterCount,
  plans,
  players,
  formationId,
  customFormationTemplateId,
  resolvedFormation,
  canEditPlan,
  canExecute,
}: SubstitutionPlannerProps) {
  const actions = useSubstitutionPlanActions(matchId);
  const seasonMinutesByPlayerId = useSeasonMinutesMap(teamId);
  const [showCardMinutes, setShowCardMinutes] = useShowCardMinutes();
  const cardMinutes = showCardMinutes ? seasonMinutesByPlayerId : undefined;
  const [selectedQuarter, setSelectedQuarter] = useState(1);
  const [rightTab, setRightTab] = useState<"plan" | "seizoen">("plan");

  useEffect(() => {
    if (selectedQuarter > quarterCount) {
      setSelectedQuarter(quarterCount);
    }
  }, [quarterCount, selectedQuarter]);

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
    <main className="min-h-screen bg-gray-100 pb-8">
      <nav className="bg-dia-yellow text-dia-black border-b-2 border-dia-black px-4 py-2 sticky top-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            <Link
              href={`/coach/match/${matchId}`}
              className="flex min-h-[44px] items-center px-2 text-sm opacity-80 hover:opacity-100"
            >
              ← Coach
            </Link>
            <Link
              href={`/present/match/${publicCode}/kleedkamer?tab=opstelling`}
              className="flex min-h-[44px] items-center px-2 text-sm opacity-80 hover:opacity-100"
            >
              Opstelling
            </Link>
          </div>
          <span className="text-xs opacity-60">Planscherm</span>
        </div>
      </nav>

      <header className="mx-auto max-w-7xl px-4 pt-4">
        <h1 className="text-xl font-bold text-gray-900 md:text-2xl">
          Wisselplan · {teamName} vs {opponent}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Tik op het veld om te plannen. Rechts zie je het plan live meegroeien.
        </p>
        <div className="mt-3 flex flex-col gap-3">
          <FormationSelector
            matchId={matchId}
            teamId={teamId}
            formationId={formationId}
            customFormationTemplateId={customFormationTemplateId}
            canEdit={canEditPlan}
            showLineupToggle={false}
          />
          <CardMinutesToggle
            enabled={showCardMinutes}
            onChange={setShowCardMinutes}
          />
        </div>
      </header>

      {actions.error ? (
        <div className="mx-auto mt-4 max-w-7xl px-4">
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {actions.error}
          </div>
        </div>
      ) : null}

      <div className="mx-auto mt-4 grid max-w-7xl grid-cols-1 gap-4 px-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="rounded-xl bg-white p-4 shadow-md lg:sticky lg:top-14 lg:self-start">
          {!resolvedFormation || !projection.quarterPreview ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
              Kies hierboven een formatie om het veld te gebruiken.
            </div>
          ) : (
            <ProjectedPitchPlanner
              formation={resolvedFormation}
              quarterCount={quarterCount}
              selectedQuarter={selectedQuarter}
              onQuarterChange={setSelectedQuarter}
              preview={projection.quarterPreview}
              quarterlessPendingCount={
                projection.quarterlessPendingRows.length
              }
              canEdit={canEditPlan}
              isBusy={fieldBusy}
              pitchMaxWidthClass="max-w-3xl"
              seasonMinutesByPlayerId={cardMinutes}
          onCreatePlan={(outId, inId, minute) =>
            actions.addSubstitution(outId, inId, selectedQuarter, minute)
          }
          onCreatePositionSwap={(aId, bId, minute) =>
            actions.addPositionSwap(aId, bId, selectedQuarter, minute)
          }
            />
          )}
        </section>

        <section className="space-y-4 overflow-y-auto rounded-xl bg-white p-4 shadow-md lg:max-h-[calc(100dvh-5rem)]">
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setRightTab("plan")}
              className={`min-h-[44px] flex-1 rounded-md text-sm font-semibold ${
                rightTab === "plan"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600"
              }`}
            >
              Plan
            </button>
            <button
              type="button"
              onClick={() => setRightTab("seizoen")}
              className={`min-h-[44px] flex-1 rounded-md text-sm font-semibold ${
                rightTab === "seizoen"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600"
              }`}
            >
              Seizoen
            </button>
          </div>

          {rightTab === "plan" ? (
            <>
              <PlanBenchSummary
                startingBench={projection.startingBench}
                projectedBench={projection.projectedBench}
              />

              {canEditPlan ? (
                <PlanAddForm
                  quarterCount={quarterCount}
                  projectedOnField={
                    projection.quarterPreview?.projectedOnField ??
                    projection.projectedOnField
                  }
                  projectedBench={
                    projection.quarterPreview?.projectedBench ??
                    projection.projectedBench
                  }
                  isBusy={actions.busy === "add"}
                  onAdd={async (payload) => {
                    const ok = await actions.addFromForm(payload);
                    if (ok && payload.targetQuarter != null) {
                      setSelectedQuarter(payload.targetQuarter);
                    }
                    return ok;
                  }}
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
            </>
          ) : (
            <TeamSeasonMinutesPanel teamId={teamId} />
          )}
        </section>
      </div>
    </main>
  );
}
