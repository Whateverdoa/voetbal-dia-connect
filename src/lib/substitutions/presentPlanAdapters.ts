import type { Id } from "@/convex/_generated/dataModel";
import { formatFieldLabel } from "@/lib/cards/formatCardName";
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
  injured?: boolean;
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

/**
 * Dutch name for a plan kind. Single source for both the coach panel and the TV
 * sidebar, so the two can't drift apart on the one distinction that decides
 * whether a player leaves the pitch or only moves on it.
 */
export function planKindLabel(kind: SubstitutionPlanKind | undefined): string {
  return kind === "positionSwap" ? "Positiewissel" : "Wissel";
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

/**
 * Map every player standing in a formation slot to that slot's position.
 * Players without a slot (bench, or on the field but unassigned) are absent, so
 * callers can tell "plays CB" apart from "has no position yet".
 */
export function fieldPositionLookup(
  onField: readonly Pick<MatchPlayer, "playerId" | "fieldSlotIndex">[],
  slots: readonly { id: number; position: string }[]
): Map<string, string> {
  const positionBySlot = new Map(slots.map((slot) => [slot.id, slot.position]));
  const lookup = new Map<string, string>();
  for (const player of onField) {
    if (player.fieldSlotIndex == null) continue;
    const position = positionBySlot.get(Number(player.fieldSlotIndex));
    if (position) lookup.set(String(player.playerId), position);
  }
  return lookup;
}

export function presentRowLabel(
  row: Pick<PresentPlanRow, "kind" | "outDisplayName" | "inDisplayName"> & {
    playerOutId?: PresentPlanRow["playerOutId"];
    playerInId?: PresentPlanRow["playerInId"];
  },
  numberByPlayerId?: ReadonlyMap<string, number | null>,
  positionByPlayerId?: ReadonlyMap<string, string>
): string {
  const outName = playerToken(
    row.outDisplayName,
    row.playerOutId,
    numberByPlayerId,
    positionByPlayerId
  );
  const inName = playerToken(
    row.inDisplayName,
    row.playerInId,
    numberByPlayerId,
    positionByPlayerId
  );
  return row.kind === "positionSwap"
    ? `${outName} ↔ ${inName}`
    : `${outName} → ${inName}`;
}

function playerToken(
  displayName: string,
  playerId: Id<"players"> | undefined,
  numberByPlayerId?: ReadonlyMap<string, number | null>,
  positionByPlayerId?: ReadonlyMap<string, string>
): string {
  const key = playerId != null ? String(playerId) : undefined;
  const number = key ? numberByPlayerId?.get(key) : undefined;
  const label = formatFieldLabel(displayName, number ?? null);
  const position = key ? positionByPlayerId?.get(key) : undefined;
  return position ? `${label} (${position})` : label;
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
    injured: player.injured ?? false,
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
