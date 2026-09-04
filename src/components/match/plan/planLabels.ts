import { firstNameOf, formatFieldLabel } from "@/lib/cards/formatCardName";
import { periodChipLabel } from "@/lib/substitutions/suggestPeriodFromMinute";
import { planKindLabel } from "@/lib/substitutions/presentPlanAdapters";
import type {
  MatchPlayer,
  SubstitutionPlanKind,
  SubstitutionPlanRow,
} from "@/components/match/types";

export function names(players: MatchPlayer[]): string {
  return players.length === 0
    ? "geen"
    : players
        .map((player) => formatFieldLabel(player.name, player.number))
        .filter(Boolean)
        .join(", ");
}

export function periodWord(quarterCount: number): string {
  return quarterCount === 2 ? "helft" : "kwart";
}

/** Compact timing for narrow list rows (e.g. "H1 · ~8.5"). */
export function timingLabel(
  row: SubstitutionPlanRow,
  quarterCount: number
): string {
  const chip =
    row.targetQuarter != null
      ? periodChipLabel(row.targetQuarter, quarterCount)
      : null;
  if (chip != null && row.targetMinute != null) {
    return `${chip} · ~${row.targetMinute}`;
  }
  if (chip != null) {
    return chip;
  }
  if (row.targetMinute != null) {
    return `~${row.targetMinute}'`;
  }
  return "—";
}

export function rowKind(row: SubstitutionPlanRow): SubstitutionPlanKind {
  return row.kind ?? "substitution";
}

/** First name + shirt number for both sides (e.g. "Sem 7 → Krijn 12"). */
export function rowLabel(row: SubstitutionPlanRow): string {
  const left =
    formatFieldLabel(row.outName ?? "", row.outNumber) ||
    firstNameOf(row.outName ?? "") ||
    "?";
  const right =
    formatFieldLabel(row.inName ?? "", row.inNumber) ||
    firstNameOf(row.inName ?? "") ||
    "?";
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
