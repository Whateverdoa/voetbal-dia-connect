"use client";

import { useEffect, useMemo, useState } from "react";
import { projectSubstitutionPlan } from "@/lib/substitutions/projectSubstitutionPlan";
import { useSubstitutionPlanActions } from "@/hooks/useSubstitutionPlanActions";
import { useSeasonMinutesMap } from "@/hooks/useSeasonMinutesMap";
import { useShowCardMinutes } from "@/hooks/useShowCardMinutes";
import type { PitchLayout } from "@/lib/halfPitchLayout";
import type { Id } from "@/convex/_generated/dataModel";
import type {
  MatchPlayer,
  MatchStatus,
  SubstitutionPlanRow,
} from "@/components/match/types";

export function useSubstitutionPlannerBoard({
  matchId,
  teamId,
  players,
  plans,
  quarterCount,
  status,
  canExecute,
}: {
  matchId: Id<"matches">;
  teamId: Id<"teams">;
  players: MatchPlayer[];
  plans: SubstitutionPlanRow[];
  quarterCount: number;
  status: MatchStatus;
  canExecute: boolean;
}) {
  const actions = useSubstitutionPlanActions(matchId);
  const seasonMinutesByPlayerId = useSeasonMinutesMap(teamId);
  const [showCardMinutes, setShowCardMinutes] = useShowCardMinutes();
  const cardMinutes = showCardMinutes ? seasonMinutesByPlayerId : undefined;
  const [selectedQuarter, setSelectedQuarter] = useState(1);
  const [rightTab, setRightTab] = useState<"plan" | "seizoen">("plan");
  const [pitchLayout, setPitchLayout] = useState<PitchLayout>("full");

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

  return {
    actions,
    showCardMinutes,
    setShowCardMinutes,
    cardMinutes,
    selectedQuarter,
    setSelectedQuarter,
    rightTab,
    setRightTab,
    pitchLayout,
    setPitchLayout,
    projection,
    warningByPlanId,
    canPressExecute:
      (status === "live" || status === "halftime") && canExecute,
    pending: plans.filter((plan) => plan.status === "pending"),
    done: plans.filter((plan) => plan.status !== "pending"),
    fieldBusy: actions.busy === "field-add" || actions.busy === "field-swap",
  };
}
