"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MatchLoadingScreen, MatchErrorScreen } from "@/components/match";
import type { MatchPlayer } from "@/components/match";
import { SubstitutionPlanner } from "@/components/match/plan/SubstitutionPlanner";
import { resolveMatchFormation } from "@/lib/formations/resolveMatchFormation";

export default function CoachWisselplanPage() {
  const params = useParams();
  const matchIdParam = params.id;
  const matchId =
    typeof matchIdParam === "string"
      ? (matchIdParam as Id<"matches">)
      : null;

  const match = useQuery(
    api.matches.getForCoach,
    matchId ? { matchId } : "skip"
  );

  if (!matchId) {
    return (
      <MatchErrorScreen
        message="Ongeldige wedstrijdlink"
        backHref="/coach"
      />
    );
  }

  if (match === undefined) {
    return <MatchLoadingScreen />;
  }

  if (match === null) {
    return (
      <MatchErrorScreen
        message="Wedstrijd niet gevonden of je hebt geen toegang tot deze wedstrijd"
        backHref="/coach"
      />
    );
  }

  const players = match.players as MatchPlayer[];

  const resolvedFormation = resolveMatchFormation(
    match.formationId,
    match.customFormationTemplate
      ? {
          name: match.customFormationTemplate.name,
          kind: match.customFormationTemplate.kind,
          slots: match.customFormationTemplate.slots,
          links: match.customFormationTemplate.links,
        }
      : undefined
  );

  const isPregame = match.status === "scheduled" || match.status === "lineup";
  const canEditPlan = isPregame || (match.isCurrentCoachLead ?? false);
  const canExecute = match.isCurrentCoachLead ?? false;

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
      players={players}
      formationId={match.formationId ?? undefined}
      customFormationTemplateId={match.customFormationTemplate?._id}
      resolvedFormation={resolvedFormation}
      canEditPlan={canEditPlan}
      canExecute={canExecute}
    />
  );
}
