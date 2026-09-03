import { planKindLabel } from "@/lib/substitutions/presentPlanAdapters";
import type {
  MatchPlayer,
  SubstitutionPlanKind,
  SubstitutionPlanRow,
} from "@/components/match/types";

export function names(players: MatchPlayer[]): string {
  return players.length === 0
    ? "geen"
    : players.map((player) => player.name).join(", ");
}

export function periodWord(quarterCount: number): string {
  return quarterCount === 2 ? "helft" : "kwart";
}

export function timingLabel(
  row: SubstitutionPlanRow,
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

export function rowKind(row: SubstitutionPlanRow): SubstitutionPlanKind {
  return row.kind ?? "substitution";
}

export function rowLabel(row: SubstitutionPlanRow): string {
  const left = row.outName ?? "?";
  const right = row.inName ?? "?";
  return rowKind(row) === "positionSwap"
    ? `${left} ↔ ${right}`
    : `${left} → ${right}`;
}

export function rowBadge(row: SubstitutionPlanRow): string {
  return planKindLabel(rowKind(row));
}

/** Same colour language as the TV sidebar: amber leaves the pitch, sky stays on it. */
export function rowBadgeClass(row: SubstitutionPlanRow): string {
  return rowKind(row) === "positionSwap"
    ? "bg-sky-100 text-sky-800"
    : "bg-amber-100 text-amber-800";
}
