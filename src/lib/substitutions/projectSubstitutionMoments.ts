import type { MatchPlayer, SubstitutionPlanRow } from "@/components/match/types";
import {
  runProjection,
  type ProjectedPlanWarning,
} from "./projectSubstitutionPlan";
import { periodWord } from "./presentPlanAdapters";

export type SubstitutionMomentId = string;

export interface SubstitutionMoment {
  id: SubstitutionMomentId;
  /** Short Dutch label for the sidebar button, e.g. "Begin" or "K2 · min ~10". */
  label: string;
  /** Plan rows that fire at this moment (empty for the kickoff snapshot). */
  rows: SubstitutionPlanRow[];
  onField: MatchPlayer[];
  bench: MatchPlayer[];
  warnings: ProjectedPlanWarning[];
}

/** Timing fields for `addPlanItem` when planning from a selected moment. */
export type PlanMomentTiming = {
  targetQuarter?: number;
  targetMinute?: number;
  insertAtQuarterBoundary: boolean;
};

/**
 * Derive addPlanItem timing from the active sidebar moment.
 * Begin → start of quarter 1; timed moments copy quarter/minute from their rows.
 */
export function planTimingFromMoment(
  moment: Pick<SubstitutionMoment, "id" | "rows">
): PlanMomentTiming {
  if (moment.id === "kickoff") {
    return { targetQuarter: 1, insertAtQuarterBoundary: true };
  }
  if (moment.id === "untimed") {
    return { insertAtQuarterBoundary: false };
  }
  const first = moment.rows[0];
  if (!first) {
    return { insertAtQuarterBoundary: false };
  }
  const timing: PlanMomentTiming = {
    insertAtQuarterBoundary:
      first.targetQuarter != null && first.targetMinute == null,
  };
  if (first.targetQuarter != null) {
    timing.targetQuarter = first.targetQuarter;
  }
  if (first.targetMinute != null) {
    timing.targetMinute = first.targetMinute;
  }
  return timing;
}

function byMomentOrder(a: SubstitutionPlanRow, b: SubstitutionPlanRow): number {
  const qa = a.targetQuarter ?? Number.POSITIVE_INFINITY;
  const qb = b.targetQuarter ?? Number.POSITIVE_INFINITY;
  if (qa !== qb) return qa - qb;

  const ma = a.targetMinute ?? -1;
  const mb = b.targetMinute ?? -1;
  if (ma !== mb) return ma - mb;

  return a.sequence - b.sequence || String(a._id).localeCompare(String(b._id));
}

function momentKey(row: SubstitutionPlanRow): string {
  return momentIdFromTiming(row);
}

/** Sidebar / pitch moment id for a plan row or addPlan timing. */
export function momentIdFromTiming(timing: {
  targetQuarter?: number | null;
  targetMinute?: number | null;
}): string {
  if (timing.targetQuarter == null && timing.targetMinute == null) {
    return "untimed";
  }
  return `q${timing.targetQuarter ?? "x"}-m${timing.targetMinute ?? "start"}`;
}

function momentLabel(
  row: SubstitutionPlanRow,
  quarterCount: number
): string {
  if (row.targetQuarter == null && row.targetMinute == null) {
    return "Nog zonder tijdstip";
  }
  const period = periodWord(quarterCount);
  const short = quarterCount === 2 ? "H" : "K";
  if (row.targetQuarter != null && row.targetMinute != null) {
    return `${short}${row.targetQuarter} · min ~${row.targetMinute}`;
  }
  if (row.targetQuarter != null) {
    return `Start ${period} ${row.targetQuarter}`;
  }
  return `Min ~${row.targetMinute}`;
}

function groupPendingRows(
  pending: SubstitutionPlanRow[]
): SubstitutionPlanRow[][] {
  const sorted = [...pending].sort(byMomentOrder);
  const groups: SubstitutionPlanRow[][] = [];
  for (const row of sorted) {
    const key = momentKey(row);
    const last = groups[groups.length - 1];
    if (last && momentKey(last[0]!) === key) {
      last.push(row);
    } else {
      groups.push([row]);
    }
  }
  return groups;
}

/**
 * Builds one pitch snapshot per substitution moment, plus a kickoff snapshot.
 * Rows that share the same quarter+minute collapse into a single moment.
 */
export function projectSubstitutionMoments(
  players: MatchPlayer[],
  plans: SubstitutionPlanRow[],
  quarterCount: number
): SubstitutionMoment[] {
  const pending = plans
    .filter((row) => row.status === "pending")
    .sort(byMomentOrder);
  const groups = groupPendingRows(pending);

  const kickoff = runProjection(players, pending, () => false);
  const moments: SubstitutionMoment[] = [
    {
      id: "kickoff",
      label: "Begin",
      rows: [],
      onField: kickoff.onField,
      bench: kickoff.bench,
      warnings: [],
    },
  ];

  const appliedIds = new Set<string>();
  for (const group of groups) {
    for (const row of group) {
      appliedIds.add(String(row._id));
    }
    const projected = runProjection(players, pending, (plan) =>
      appliedIds.has(String(plan._id))
    );
    const first = group[0]!;
    moments.push({
      id: momentKey(first),
      label: momentLabel(first, quarterCount),
      rows: group,
      onField: projected.onField,
      bench: projected.bench,
      warnings: projected.warnings,
    });
  }

  return moments;
}
