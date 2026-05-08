import type { MatchPlayer, SubstitutionPlanRow } from "@/components/match/types";
import type { Id } from "@/convex/_generated/dataModel";

export interface ProjectedPlanWarning {
  planId: Id<"substitutionPlans">;
  message: string;
}

export interface ProjectedSubstitutionPlan {
  startingOnField: MatchPlayer[];
  startingBench: MatchPlayer[];
  projectedOnField: MatchPlayer[];
  projectedBench: MatchPlayer[];
  warnings: ProjectedPlanWarning[];
}

function bySequence(a: SubstitutionPlanRow, b: SubstitutionPlanRow): number {
  return a.sequence - b.sequence || String(a._id).localeCompare(String(b._id));
}

function playerName(player: MatchPlayer | undefined, fallback: string): string {
  return player?.name ?? fallback;
}

export function projectSubstitutionPlan(
  players: MatchPlayer[],
  plans: SubstitutionPlanRow[]
): ProjectedSubstitutionPlan {
  const eligiblePlayers = players.filter((player) => !(player.absent ?? false));
  const playerById = new Map(
    eligiblePlayers.map((player) => [String(player.playerId), player])
  );

  const startingOnField = eligiblePlayers.filter((player) => player.onField);
  const startingBench = eligiblePlayers.filter((player) => !player.onField);

  const projectedFieldIds = new Set(
    startingOnField.map((player) => String(player.playerId))
  );
  const projectedBenchIds = new Set(
    startingBench.map((player) => String(player.playerId))
  );
  const warnings: ProjectedPlanWarning[] = [];

  for (const plan of plans
    .filter((row) => row.status === "pending")
    .sort(bySequence)) {
    const outId = String(plan.playerOutId);
    const inId = String(plan.playerInId);
    const playerOut = playerById.get(outId);
    const playerIn = playerById.get(inId);

    if (!playerOut || !playerIn) {
      warnings.push({
        planId: plan._id,
        message: "Een speler in deze regel is afwezig of staat niet meer in de wedstrijd.",
      });
      continue;
    }

    if (!projectedFieldIds.has(outId)) {
      warnings.push({
        planId: plan._id,
        message: `${playerName(playerOut, plan.outName ?? "Speler eruit")} staat in de virtuele planning niet op het veld.`,
      });
      continue;
    }

    if (!projectedBenchIds.has(inId)) {
      warnings.push({
        planId: plan._id,
        message: `${playerName(playerIn, plan.inName ?? "Speler erin")} staat in de virtuele planning niet op de bank.`,
      });
      continue;
    }

    projectedFieldIds.delete(outId);
    projectedFieldIds.add(inId);
    projectedBenchIds.delete(inId);
    projectedBenchIds.add(outId);
  }

  const projectedOnField = eligiblePlayers.filter((player) =>
    projectedFieldIds.has(String(player.playerId))
  );
  const projectedBench = eligiblePlayers.filter((player) =>
    projectedBenchIds.has(String(player.playerId))
  );

  return {
    startingOnField,
    startingBench,
    projectedOnField,
    projectedBench,
    warnings,
  };
}
