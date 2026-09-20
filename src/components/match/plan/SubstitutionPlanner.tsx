"use client";

import type { Id } from "@/convex/_generated/dataModel";
import type { Formation } from "@/lib/formations/types";
import { useSubstitutionPlannerBoard } from "@/hooks/useSubstitutionPlannerBoard";
import { ProjectedPitchPlanner } from "@/components/match/ProjectedPitchPlanner";
import { TeamSeasonMinutesPanel } from "@/components/coach/TeamSeasonMinutesPanel";
import { CardMinutesToggle } from "@/components/coach/CardMinutesToggle";
import { FormationSelector } from "@/components/match/FormationSelector";
import { PitchLayoutToggle } from "@/components/presentation/PitchLayoutToggle";
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
  regulationDurationMinutes?: number;
  plans: SubstitutionPlanRow[];
  players: MatchPlayer[];
  formationId?: string;
  customFormationTemplateId?: Id<"formationTemplates">;
  resolvedFormation: Formation | undefined;
  canEditPlan: boolean;
  canExecute: boolean;
}

/**
 * Embedded coach-tab planner. The PC studio lives in SubstitutionPlannerStudio.
 */
export function SubstitutionPlanner({
  matchId,
  teamId,
  publicCode: _publicCode,
  teamName,
  opponent,
  status,
  quarterCount,
  regulationDurationMinutes = 60,
  plans,
  players,
  formationId,
  customFormationTemplateId,
  resolvedFormation,
  canEditPlan,
  canExecute,
}: SubstitutionPlannerProps) {
  const board = useSubstitutionPlannerBoard({
    matchId,
    teamId,
    players,
    plans,
    quarterCount,
    status,
    canExecute,
  });

  return (
    <div className="space-y-4">
      <header>
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
            enabled={board.showCardMinutes}
            onChange={board.setShowCardMinutes}
          />
          <PitchLayoutToggle
            value={board.pitchLayout}
            onChange={board.setPitchLayout}
          />
        </div>
      </header>

      {board.actions.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {board.actions.error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="rounded-xl bg-white p-4 shadow-md">
          {!resolvedFormation || !board.projection.quarterPreview ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-600">
              Kies hierboven een formatie om het veld te gebruiken.
            </div>
          ) : (
            <ProjectedPitchPlanner
              formation={resolvedFormation}
              quarterCount={quarterCount}
              selectedQuarter={board.selectedQuarter}
              onQuarterChange={board.setSelectedQuarter}
              preview={board.projection.quarterPreview}
              quarterlessPendingCount={
                board.projection.quarterlessPendingRows.length
              }
              canEdit={canEditPlan}
              isBusy={board.fieldBusy}
              pitchMaxWidthClass={
                board.pitchLayout === "full" ? "max-w-5xl" : "max-w-3xl"
              }
              pitchLayout={board.pitchLayout}
              seasonMinutesByPlayerId={board.cardMinutes}
              onCreatePlan={(outId, inId, minute) =>
                board.actions.addSubstitution(
                  outId,
                  inId,
                  board.selectedQuarter,
                  minute
                )
              }
              onCreatePositionSwap={(aId, bId, minute) =>
                board.actions.addPositionSwap(
                  aId,
                  bId,
                  board.selectedQuarter,
                  minute
                )
              }
            />
          )}
        </section>

        <section className="space-y-4 overflow-y-auto rounded-xl bg-white p-4 shadow-md lg:max-h-[calc(100dvh-5rem)]">
          <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => board.setRightTab("plan")}
              className={`min-h-[44px] flex-1 rounded-md text-sm font-semibold ${
                board.rightTab === "plan"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600"
              }`}
            >
              Plan
            </button>
            <button
              type="button"
              onClick={() => board.setRightTab("seizoen")}
              className={`min-h-[44px] flex-1 rounded-md text-sm font-semibold ${
                board.rightTab === "seizoen"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600"
              }`}
            >
              Seizoen
            </button>
          </div>

          {board.rightTab === "plan" ? (
            <>
              <PlanBenchSummary
                startingBench={board.projection.startingBench}
                projectedBench={board.projection.projectedBench}
              />
              {canEditPlan ? (
                <PlanAddForm
                  quarterCount={quarterCount}
                  regulationDurationMinutes={regulationDurationMinutes}
                  projectedOnField={
                    board.projection.quarterPreview?.projectedOnField ??
                    board.projection.projectedOnField
                  }
                  projectedBench={
                    board.projection.quarterPreview?.projectedBench ??
                    board.projection.projectedBench
                  }
                  isBusy={board.actions.busy === "add"}
                  onAdd={async (payload) => {
                    const ok = await board.actions.addFromForm(payload);
                    if (ok && payload.targetQuarter != null) {
                      board.setSelectedQuarter(payload.targetQuarter);
                    }
                    return ok;
                  }}
                />
              ) : null}
              <PlanRowList
                pending={board.pending}
                done={board.done}
                quarterCount={quarterCount}
                regulationDurationMinutes={regulationDurationMinutes}
                warningByPlanId={board.warningByPlanId}
                canEditPlan={canEditPlan}
                canPressExecute={board.canPressExecute}
                isBusy={board.actions.busy !== null}
                onRemove={(planId) => void board.actions.remove(planId)}
                onSkip={(planId) => void board.actions.skip(planId)}
                onExecute={(planId) => void board.actions.execute(planId)}
                onUpdateTiming={
                  canEditPlan ? board.actions.updateTiming : undefined
                }
                onClearPending={
                  canEditPlan ? board.actions.clearPending : undefined
                }
              />
            </>
          ) : (
            <TeamSeasonMinutesPanel teamId={teamId} />
          )}
        </section>
      </div>
    </div>
  );
}
