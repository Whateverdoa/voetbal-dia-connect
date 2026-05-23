import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type ReaderCtx = QueryCtx | MutationCtx;

export type EnrichedSubstitutionPlan = {
  _id: Id<"substitutionPlans">;
  matchId: Id<"matches">;
  sequence: number;
  kind: "substitution" | "positionSwap";
  targetQuarter?: number;
  targetMinute?: number;
  playerOutId: Id<"players">;
  playerInId: Id<"players">;
  status: "pending" | "skipped" | "executed";
  note?: string;
  executedAt?: number;
  createdAt: number;
  updatedAt: number;
  outName?: string;
  inName?: string;
};

export type SortableSubstitutionPlanRow<TId extends string = string> = {
  _id: TId;
  sequence: number;
  status: "pending" | "skipped" | "executed";
  targetQuarter?: number;
};

function bySequence<TId extends string>(
  a: { _id: TId; sequence: number },
  b: { _id: TId; sequence: number }
) {
  return a.sequence - b.sequence || String(a._id).localeCompare(String(b._id));
}

export function buildSubstitutionPlanOrderAfterInsert<TId extends string>(
  rows: SortableSubstitutionPlanRow<TId>[],
  newRow: SortableSubstitutionPlanRow<TId>,
  options?: { insertAtQuarterBoundary?: boolean }
): TId[] {
  const sortedRows = [...rows].sort(bySequence);

  if (
    !options?.insertAtQuarterBoundary ||
    newRow.status !== "pending" ||
    newRow.targetQuarter == null
  ) {
    return [...sortedRows, newRow].sort(bySequence).map((row) => row._id);
  }

  const quarter = newRow.targetQuarter;
  const anchor = [...sortedRows]
    .filter(
      (row) =>
        row.status === "pending" &&
        row.targetQuarter != null &&
        row.targetQuarter <= quarter
    )
    .pop();

  if (anchor) {
    const anchorIndex = sortedRows.findIndex((row) => row._id === anchor._id);
    const ordered = [...sortedRows];
    ordered.splice(anchorIndex + 1, 0, newRow);
    return ordered.map((row) => row._id);
  }

  const beforeIndex = sortedRows.findIndex(
    (row) =>
      row.status === "pending" &&
      (row.targetQuarter == null || row.targetQuarter > quarter)
  );

  if (beforeIndex === -1) {
    return [...sortedRows, newRow].map((row) => row._id);
  }

  const ordered = [...sortedRows];
  ordered.splice(beforeIndex, 0, newRow);
  return ordered.map((row) => row._id);
}

export async function nextSubstitutionPlanSequence(
  ctx: MutationCtx,
  matchId: Id<"matches">
): Promise<number> {
  const rows = await ctx.db
    .query("substitutionPlans")
    .withIndex("by_match", (q) => q.eq("matchId", matchId))
    .collect();
  return rows.reduce((max, row) => Math.max(max, row.sequence), -1) + 1;
}

export async function listEnrichedSubstitutionPlans(
  ctx: ReaderCtx,
  matchId: Id<"matches">
): Promise<EnrichedSubstitutionPlan[]> {
  const rows = await ctx.db
    .query("substitutionPlans")
    .withIndex("by_match", (q) => q.eq("matchId", matchId))
    .collect();
  rows.sort(bySequence);

  const enriched: EnrichedSubstitutionPlan[] = [];
  for (const row of rows) {
    const [playerOut, playerIn] = await Promise.all([
      ctx.db.get(row.playerOutId),
      ctx.db.get(row.playerInId),
    ]);
    enriched.push({
      _id: row._id,
      matchId: row.matchId,
      sequence: row.sequence,
      kind: row.kind ?? "substitution",
      targetQuarter: row.targetQuarter,
      targetMinute: row.targetMinute,
      playerOutId: row.playerOutId,
      playerInId: row.playerInId,
      status: row.status,
      note: row.note,
      executedAt: row.executedAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      outName: playerOut?.name,
      inName: playerIn?.name,
    });
  }
  return enriched;
}
