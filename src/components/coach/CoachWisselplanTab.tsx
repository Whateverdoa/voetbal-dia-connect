"use client";

import type { Formation } from "@/lib/formations/types";
import type { DeviceSurface } from "@/lib/deviceSurface";
import type { Match } from "@/components/match";
import { SubstitutionPlanner } from "@/components/match/plan/SubstitutionPlanner";
import { CoachWisselplanMobile } from "@/components/coach/CoachWisselplanMobile";

export function CoachWisselplanTab({
  match,
  resolvedFormation,
  surface,
  canEditPlan,
  canExecute,
}: {
  match: Match;
  resolvedFormation: Formation | undefined;
  surface: DeviceSurface;
  canEditPlan: boolean;
  canExecute: boolean;
}) {
  if (surface === "mobile") {
    return <CoachWisselplanMobile match={match} canExecute={canExecute} />;
  }

  return (
    <SubstitutionPlanner
      matchId={match._id}
      teamId={match.teamId}
      publicCode={match.publicCode}
      teamName={match.teamName}
      opponent={match.opponent}
      status={match.status}
      quarterCount={match.quarterCount}
      regulationDurationMinutes={match.regulationDurationMinutes ?? 60}
      plans={match.substitutionPlans ?? []}
      players={match.players}
      formationId={match.formationId ?? undefined}
      customFormationTemplateId={match.customFormationTemplate?._id}
      resolvedFormation={resolvedFormation}
      canEditPlan={canEditPlan}
      canExecute={canExecute}
    />
  );
}
