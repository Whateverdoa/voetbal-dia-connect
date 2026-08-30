"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { PresentationPitchView } from "@/components/presentation/PresentationPitchView";
import { PresentSubstitutionPlanView } from "@/components/presentation/PresentSubstitutionPlanView";
import { getFormation } from "@/lib/formations";
import { canPresentTactics } from "@/lib/auth/roles";
import type {
  PresentPlanPlayer,
  PresentPlanRow,
} from "@/lib/substitutions/presentPlanAdapters";

type Tab = "opstelling" | "wisselplan";

export type KleedkamerMatch = {
  publicCode: string;
  formationId: string | null;
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
  const [tab, setTab] = useState<Tab>("opstelling");
  const access = useQuery(api.userQueries.getMyRoles);
  const showWisselplan = canPresentTactics(access?.roles ?? []) && !kiosk;
  const formation = getFormation(match?.formationId ?? undefined);
  const visibleTab = tab === "wisselplan" && !showWisselplan ? "opstelling" : tab;

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-6">
        <TabButton active={visibleTab === "opstelling"} onClick={() => setTab("opstelling")}>
          Opstelling
        </TabButton>
        {showWisselplan ? (
          <TabButton active={visibleTab === "wisselplan"} onClick={() => setTab("wisselplan")}>
            Wisselplan
          </TabButton>
        ) : null}
      </div>

      {visibleTab === "opstelling" ? (
        match ? (
          <PresentationPitchView
            players={match.players}
            formationId={match.formationId ?? undefined}
            resolvedFormation={formation}
          />
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
          />
        ) : (
          <p className="text-slate-400 text-center py-16">
            Kies een wedstrijd om het wisselplan te tonen.
          </p>
        )
      ) : null}
    </>
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
