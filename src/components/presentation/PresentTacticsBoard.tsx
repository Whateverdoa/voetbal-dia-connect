"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PresentationPitchView } from "@/components/presentation/PresentationPitchView";
import { PresentSubstitutionPlanView } from "@/components/presentation/PresentSubstitutionPlanView";
import { PitchLayoutToggle } from "@/components/presentation/PitchLayoutToggle";
import { FormationSelector } from "@/components/match/FormationSelector";
import { resolveMatchFormation } from "@/lib/formations/resolveMatchFormation";
import type { CustomFormationPayload } from "@/lib/formations/resolveMatchFormation";
import { canPresentTactics } from "@/lib/auth/roles";
import { usePitchLayout } from "@/hooks/usePitchLayout";
import type { Id } from "@/convex/_generated/dataModel";
import type {
  PresentPlanPlayer,
  PresentPlanRow,
} from "@/lib/substitutions/presentPlanAdapters";

export type KleedkamerMatch = {
  matchId: Id<"matches">;
  publicCode: string;
  teamId: Id<"teams">;
  formationId: string | null;
  customFormationTemplateId: Id<"formationTemplates"> | null;
  customFormation: CustomFormationPayload | null;
  quarterCount: number;
  players: PresentPlanPlayer[];
  substitutionPlans: PresentPlanRow[];
};

interface PresentTacticsBoardProps {
  match: KleedkamerMatch | null | undefined;
  kiosk?: boolean;
}

/** Kleedkamer opstelling: formatiekeuze + veld/plan (same screen). */
export function PresentTacticsBoard({
  match,
  kiosk = false,
}: PresentTacticsBoardProps) {
  const [pitchLayout, setPitchLayout] = usePitchLayout();
  const access = useQuery(api.userQueries.getMyRoles);
  const canEdit = canPresentTactics(access?.roles ?? []) && !kiosk;
  const accessPending = !kiosk && access === undefined;
  const formation = resolveMatchFormation(
    match?.formationId ?? undefined,
    match?.customFormation
  );
  const customKind = match?.customFormation?.kind;

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col overflow-hidden">
      <div className="shrink-0 flex flex-wrap items-center gap-2 mb-4">
        <span className="px-4 py-2 rounded-lg font-semibold min-h-[48px] flex items-center bg-dia-green text-white">
          Opstelling
        </span>
        <div className="ml-auto">
          <PitchLayoutToggle
            value={pitchLayout}
            onChange={setPitchLayout}
            variant="dark"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
        {accessPending ? (
          <p className="text-slate-400 text-center py-16">
            Toegang controleren…
          </p>
        ) : match ? (
          <>
            {canEdit ? (
              <div className="shrink-0">
                <FormationSelector
                  matchId={match.matchId}
                  teamId={match.teamId}
                  formationId={match.formationId ?? undefined}
                  customFormationTemplateId={
                    match.customFormationTemplateId ?? undefined
                  }
                  canEdit
                  showLineupToggle={false}
                  variant="dark"
                />
              </div>
            ) : null}

            <div className="flex-1 min-h-0 overflow-hidden">
              {canEdit ? (
                <PresentSubstitutionPlanView
                  matchId={match.matchId}
                  canEdit
                  players={match.players}
                  plans={match.substitutionPlans}
                  quarterCount={match.quarterCount}
                  formationId={match.formationId ?? undefined}
                  resolvedFormation={formation}
                  customFormationKind={customKind}
                  pitchLayout={pitchLayout}
                />
              ) : (
                <PresentationPitchView
                  players={match.players}
                  formationId={match.formationId ?? undefined}
                  resolvedFormation={formation}
                  customFormationKind={customKind}
                  fill
                  orientation="landscape"
                  pitchLayout={pitchLayout}
                />
              )}
            </div>
          </>
        ) : (
          <p className="text-slate-400 text-center py-16">
            Kies een wedstrijd om de opstelling te tonen.
          </p>
        )}
      </div>
    </div>
  );
}
