import type { MatchPlayer, SubstitutionPlanRow } from "@/components/match/types";
import type { Id } from "@/convex/_generated/dataModel";

export interface ProjectedPlanWarning {
  planId: Id<"substitutionPlans">;
  message: string;
}

export interface QuarterPreviewProjection {
  quarter: number;
  quarterStartOnField: MatchPlayer[];
  quarterStartBench: MatchPlayer[];
  projectedOnField: MatchPlayer[];
  projectedBench: MatchPlayer[];
  warnings: ProjectedPlanWarning[];
}

export interface ProjectedSubstitutionPlan {
  startingOnField: MatchPlayer[];
  startingBench: MatchPlayer[];
  projectedOnField: MatchPlayer[];
  projectedBench: MatchPlayer[];
  warnings: ProjectedPlanWarning[];
  quarterlessPendingRows: SubstitutionPlanRow[];
  quarterPreview?: QuarterPreviewProjection;
}

type PlayerState = Map<string, MatchPlayer>;

function bySequence(a: SubstitutionPlanRow, b: SubstitutionPlanRow): number {
  return a.sequence - b.sequence || String(a._id).localeCompare(String(b._id));
}

function cloneEligiblePlayers(players: MatchPlayer[]): MatchPlayer[] {
  return players
    .filter((player) => !(player.absent ?? false))
    .map((player) => ({ ...player }));
}

function createPlayerState(players: MatchPlayer[]): PlayerState {
  return new Map(players.map((player) => [String(player.playerId), { ...player }]));
}

function playerName(player: MatchPlayer | undefined, fallback: string): string {
  return player?.name ?? fallback;
}

function swapProjectedFieldSlots(playerA: MatchPlayer, playerB: MatchPlayer) {
  const slotA = playerA.fieldSlotIndex;
  playerA.fieldSlotIndex = playerB.fieldSlotIndex;
  playerB.fieldSlotIndex = slotA;
}

function snapshotPlayers(players: MatchPlayer[], state: PlayerState) {
  const onField: MatchPlayer[] = [];
  const bench: MatchPlayer[] = [];

  for (const player of players) {
    const current = state.get(String(player.playerId));
    if (!current) continue;
    if (current.onField) {
      onField.push(current);
    } else {
      bench.push(current);
    }
  }

  return { onField, bench };
}

function applyPlanRow(
  plan: SubstitutionPlanRow,
  state: PlayerState,
  warnings: ProjectedPlanWarning[]
): boolean {
  const outId = String(plan.playerOutId);
  const inId = String(plan.playerInId);
  const playerOut = state.get(outId);
  const playerIn = state.get(inId);

  if (!playerOut || !playerIn) {
    warnings.push({
      planId: plan._id,
      message: "Een speler in deze regel is afwezig of staat niet meer in de wedstrijd.",
    });
    return false;
  }

  if (plan.kind === "positionSwap") {
    if (!playerOut.onField) {
      warnings.push({
        planId: plan._id,
        message: `${playerName(playerOut, plan.outName ?? "Speler A")} staat in deze planning niet op het veld voor een positiewissel.`,
      });
      return false;
    }

    if (!playerIn.onField) {
      warnings.push({
        planId: plan._id,
        message: `${playerName(playerIn, plan.inName ?? "Speler B")} staat in deze planning niet op het veld voor een positiewissel.`,
      });
      return false;
    }

    swapProjectedFieldSlots(playerOut, playerIn);
    return true;
  }

  if (!playerOut.onField) {
    warnings.push({
      planId: plan._id,
      message: `${playerName(playerOut, plan.outName ?? "Speler eruit")} staat in deze planning niet op het veld.`,
    });
    return false;
  }

  if (playerIn.onField) {
    warnings.push({
      planId: plan._id,
      message: `${playerName(playerIn, plan.inName ?? "Speler erin")} staat in deze planning niet op de bank.`,
    });
    return false;
  }

  const slotToTransfer = playerOut.fieldSlotIndex;
  playerOut.onField = false;
  playerOut.fieldSlotIndex = undefined;
  playerIn.onField = true;
  playerIn.fieldSlotIndex = slotToTransfer;

  return true;
}

function runProjection(
  players: MatchPlayer[],
  plans: SubstitutionPlanRow[],
  shouldApply: (plan: SubstitutionPlanRow) => boolean
) {
  const eligiblePlayers = cloneEligiblePlayers(players);
  const state = createPlayerState(eligiblePlayers);
  const warnings: ProjectedPlanWarning[] = [];

  for (const plan of plans) {
    if (!shouldApply(plan)) continue;
    applyPlanRow(plan, state, warnings);
  }

  return {
    ...snapshotPlayers(eligiblePlayers, state),
    warnings,
  };
}

export function projectSubstitutionPlan(
  players: MatchPlayer[],
  plans: SubstitutionPlanRow[],
  selectedQuarter?: number
): ProjectedSubstitutionPlan {
  const pendingPlans = plans.filter((row) => row.status === "pending").sort(bySequence);
  const quarterlessPendingRows = pendingPlans.filter((row) => row.targetQuarter == null);
  const starting = snapshotPlayers(
    cloneEligiblePlayers(players),
    createPlayerState(cloneEligiblePlayers(players))
  );

  const projected = runProjection(players, pendingPlans, () => true);

  if (selectedQuarter == null) {
    return {
      startingOnField: starting.onField,
      startingBench: starting.bench,
      projectedOnField: projected.onField,
      projectedBench: projected.bench,
      warnings: projected.warnings,
      quarterlessPendingRows,
    };
  }

  const quarterStart = runProjection(
    players,
    pendingPlans,
    (plan) => plan.targetQuarter != null && plan.targetQuarter < selectedQuarter
  );

  const quarterProjected = runProjection(
    players,
    pendingPlans,
    (plan) => plan.targetQuarter != null && plan.targetQuarter <= selectedQuarter
  );

  return {
    startingOnField: starting.onField,
    startingBench: starting.bench,
    projectedOnField: projected.onField,
    projectedBench: projected.bench,
    warnings: projected.warnings,
    quarterlessPendingRows,
    quarterPreview: {
      quarter: selectedQuarter,
      quarterStartOnField: quarterStart.onField,
      quarterStartBench: quarterStart.bench,
      projectedOnField: quarterProjected.onField,
      projectedBench: quarterProjected.bench,
      warnings: quarterProjected.warnings,
    },
  };
}
