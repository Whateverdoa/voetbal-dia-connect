"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PresentationPitchView } from "@/components/presentation/PresentationPitchView";
import { PresentSubstitutionPlanView } from "@/components/presentation/PresentSubstitutionPlanView";
import { FormationSelector } from "@/components/match/FormationSelector";
import { resolveMatchFormation } from "@/lib/formations/resolveMatchFormation";
import type { CustomFormationPayload } from "@/lib/formations/resolveMatchFormation";
import { canPresentTactics } from "@/lib/auth/roles";
import type { Id } from "@/convex/_generated/dataModel";
import type {
  PresentPlanPlayer,
  PresentPlanRow,
} from "@/lib/substitutions/presentPlanAdapters";

type Tab = "opstelling" | "wisselplan";

function parseBoardTab(value: string | null): Tab {
  return value === "wisselplan" ? "wisselplan" : "opstelling";
}

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

/** Kleedkamer-tab: opstelling + wisselplan. */
export function PresentTacticsBoard({
  match,
  kiosk = false,
}: PresentTacticsBoardProps) {
  const search = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => parseBoardTab(search.get("view")));
  const access = useQuery(api.userQueries.getMyRoles);
  const canEditFormation = canPresentTactics(access?.roles ?? []) && !kiosk;
  const showWisselplan = canEditFormation;
  const formation = resolveMatchFormation(
    match?.formationId ?? undefined,
    match?.customFormation
  );
  const customKind = match?.customFormation?.kind;
  const visibleTab = tab === "wisselplan" && !showWisselplan ? "opstelling" : tab;

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col overflow-hidden">
      <div className="shrink-0 flex flex-wrap gap-2 mb-4">
        <TabButton active={visibleTab === "opstelling"} onClick={() => setTab("opstelling")}>
          Opstelling
        </TabButton>
        {showWisselplan ? (
          <TabButton active={visibleTab === "wisselplan"} onClick={() => setTab("wisselplan")}>
            Wisselplan
          </TabButton>
        ) : null}
      </div>

      <div
        className={
          visibleTab === "opstelling"
            ? "flex-1 min-h-0 overflow-hidden"
            : "flex-1 min-h-0 overflow-auto"
        }
      >
        {visibleTab === "opstelling" ? (
          match ? (
            <div className="h-full min-h-0 flex flex-col gap-3">
              {canEditFormation ? (
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
              <div className="flex-1 min-h-0">
                <PresentationPitchView
                  players={match.players}
                  formationId={match.formationId ?? undefined}
                  resolvedFormation={formation}
                  customFormationKind={customKind}
                  fill
                />
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-center py-16">
              Kies een wedstrijd om de opstelling te tonen.
            </p>
          )
        ) : null}

        {visibleTab === "wisselplan" && showWisselplan ? (
          match ? (
            <PresentSubstitutionPlanView
              players={match.players}
              plans={match.substitutionPlans}
              quarterCount={match.quarterCount}
              formationId={match.formationId ?? undefined}
              resolvedFormation={formation}
              customFormationKind={customKind}
            />
          ) : (
            <p className="text-slate-400 text-center py-16">
              Kies een wedstrijd om het wisselplan te tonen.
            </p>
          )
        ) : null}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-semibold min-h-[48px] ${
        active
          ? "bg-dia-black text-dia-yellow ring-2 ring-dia-yellow"
          : "bg-dia-yellow text-black"
      }`}
    >
      {children}
    </button>
  );
}
