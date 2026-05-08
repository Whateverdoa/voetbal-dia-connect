import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type ReaderCtx = QueryCtx | MutationCtx;

export type EnrichedSubstitutionPlan = {
  _id: Id<"substitutionPlans">;
  matchId: Id<"matches">;
  sequence: number;
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
  rows.sort((a, b) => a.sequence - b.sequence || String(a._id).localeCompare(String(b._id)));

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
