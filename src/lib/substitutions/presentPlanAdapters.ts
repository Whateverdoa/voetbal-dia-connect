import type { Id } from "@/convex/_generated/dataModel";
import { firstNameOf } from "@/lib/cards/formatCardName";
import type {
  MatchPlayer,
  SubstitutionPlanKind,
  SubstitutionPlanRow,
} from "@/components/match/types";

export type PresentPlanPlayer = {
  playerId: string;
  displayName: string;
  number: number | null;
  onField: boolean;
  fieldSlotIndex: number | null;
  isKeeper: boolean;
  absent: boolean;
  photoUrl?: string | null;
  positionPrimary?: string | null;
};

export type PresentPlanRow = {
  _id: Id<"substitutionPlans">;
  matchId: Id<"matches">;
  sequence: number;
  kind: SubstitutionPlanKind;
  targetQuarter: number | null;
  targetMinute: number | null;
  playerOutId: Id<"players">;
  playerInId: Id<"players">;
  status: "pending" | "skipped" | "executed";
  note: string | null;
  outDisplayName: string;
  inDisplayName: string;
};

export function periodWord(quarterCount: number): string {
  return quarterCount === 2 ? "helft" : "kwart";
}

export function timingLabel(
  row: Pick<PresentPlanRow, "targetQuarter" | "targetMinute">,
  quarterCount: number
): string {
  const period = periodWord(quarterCount);
  if (row.targetQuarter != null && row.targetMinute != null) {
    return `${period} ${row.targetQuarter} · min ~${row.targetMinute}`;
  }
  if (row.targetQuarter != null) {
    return `start ${period} ${row.targetQuarter}`;
  }
  if (row.targetMinute != null) {
    return `min ~${row.targetMinute}`;
  }
  return `start ${period}`;
}

export function presentRowLabel(
  row: Pick<PresentPlanRow, "kind" | "outDisplayName" | "inDisplayName">
): string {
  const outName = firstNameOf(row.outDisplayName);
  const inName = firstNameOf(row.inDisplayName);
  return row.kind === "positionSwap"
    ? `${outName} ↔ ${inName}`
    : `${outName} → ${inName}`;
}

export function toMatchPlayers(players: PresentPlanPlayer[]): MatchPlayer[] {
  return players.map((player) => ({
    matchPlayerId: `present-${player.playerId}` as Id<"matchPlayers">,
    playerId: player.playerId as Id<"players">,
    name: player.displayName,
    number: player.number ?? undefined,
    onField: player.onField,
    isKeeper: player.isKeeper,
    absent: player.absent,
    positionPrimary: player.positionPrimary ?? undefined,
    fieldSlotIndex: player.fieldSlotIndex ?? undefined,
  }));
}

export function toPlanRows(plans: PresentPlanRow[]): SubstitutionPlanRow[] {
  return plans.map((plan) => ({
    _id: plan._id,
    matchId: plan.matchId,
    sequence: plan.sequence,
    kind: plan.kind,
    targetQuarter: plan.targetQuarter ?? undefined,
    targetMinute: plan.targetMinute ?? undefined,
    playerOutId: plan.playerOutId,
    playerInId: plan.playerInId,
    status: plan.status,
    note: plan.note ?? undefined,
    createdAt: 0,
    updatedAt: 0,
    outName: plan.outDisplayName,
    inName: plan.inDisplayName,
  }));
}
