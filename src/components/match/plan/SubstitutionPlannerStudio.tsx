"use client";

import Link from "next/link";
import type { Id } from "@/convex/_generated/dataModel";
import type { Formation } from "@/lib/formations/types";
import { useSubstitutionPlannerBoard } from "@/hooks/useSubstitutionPlannerBoard";
import { ProjectedPitchPlanner } from "@/components/match/ProjectedPitchPlanner";
import { CardMinutesToggle } from "@/components/coach/CardMinutesToggle";
import { FormationSelector } from "@/components/match/FormationSelector";
import { PitchLayoutToggle } from "@/components/presentation/PitchLayoutToggle";
import { PresentationShell } from "@/components/presentation/PresentationShell";
import { PlanAddForm } from "@/components/match/plan/PlanAddForm";
import { PlanBenchSummary } from "@/components/match/plan/PlanBenchSummary";
import { PlanRowList } from "@/components/match/plan/PlanRowList";
import type {
  MatchPlayer,
  MatchStatus,
  SubstitutionPlanRow,
} from "@/components/match/types";

interface SubstitutionPlannerStudioProps {
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

/** Full-viewport PC planscherm: pitch letterboxed, plan in a slim sidebar. */
export function SubstitutionPlannerStudio({
  matchId,
  teamId,
  publicCode,
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
}: SubstitutionPlannerStudioProps) {
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
    <PresentationShell
      title={`${teamName} vs ${opponent}`}
      subtitle="Plannen · tik op het veld"
      compact
      actions={
        <div className="flex max-w-[52rem] flex-wrap items-center justify-end gap-2">
          <FormationSelector
            matchId={matchId}
            teamId={teamId}
            formationId={formationId}
            customFormationTemplateId={customFormationTemplateId}
            canEdit={canEditPlan}
            showLineupToggle={false}
            variant="dark"
          />
          <CardMinutesToggle
            enabled={board.showCardMinutes}
            onChange={board.setShowCardMinutes}
            variant="dark"
          />
          <PitchLayoutToggle
            value={board.pitchLayout}
            onChange={board.setPitchLayout}
            variant="dark"
          />
          <Link
            href={`/coach/match/${matchId}`}
            className="flex min-h-[48px] items-center rounded-lg bg-black/20 px-4 py-2 font-semibold"
          >
            ← Coach
          </Link>
          <Link
            href={`/present/match/${publicCode}/kleedkamer?tab=opstelling`}
            className="flex min-h-[48px] items-center rounded-lg bg-white/15 px-4 py-2 font-semibold"
          >
            Presenteren
          </Link>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
          {board.actions.error ? (
            <div className="shrink-0 rounded-xl border border-red-500/40 bg-red-950/40 p-3 text-sm text-red-100">
              {board.actions.error}
            </div>
          ) : null}
          <div className="min-h-0 flex-1">
            {!resolvedFormation || !board.projection.quarterPreview ? (
              <div className="rounded-xl border border-dashed border-white/20 p-4 text-sm text-white/70">
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
                pitchMaxWidthClass="max-w-none"
                pitchLayout={board.pitchLayout}
                fill
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
          </div>
        </section>

        <aside className="flex max-h-[42vh] min-h-0 flex-col overflow-y-auto rounded-xl bg-white p-3 lg:max-h-none lg:w-[22rem]">
          <PlanBenchSummary
            startingBench={board.projection.startingBench}
            projectedBench={board.projection.projectedBench}
          />
          {canEditPlan ? (
            <div className="mt-3">
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
            </div>
          ) : null}
          <div className="mt-3">
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
          </div>
        </aside>
      </div>
    </PresentationShell>
  );
}
