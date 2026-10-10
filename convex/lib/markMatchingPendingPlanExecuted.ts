/**
 * When a live substitution happens outside executePlanItem, mark the matching
 * pending plan row executed so the planner projection stays in sync.
 */
import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export async function markMatchingPendingPlanExecuted(
  ctx: MutationCtx,
  args: {
    matchId: Id<"matches">;
    playerOutId: Id<"players">;
    playerInId: Id<"players">;
    kind?: "substitution" | "positionSwap";
  }
): Promise<Id<"substitutionPlans"> | null> {
  const kind = args.kind ?? "substitution";
  const plans = await ctx.db
    .query("substitutionPlans")
    .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
    .collect();

  const pending = plans
    .filter((row) => row.status === "pending")
    .filter((row) => (row.kind ?? "substitution") === kind)
    .filter(
      (row) =>
        row.playerOutId === args.playerOutId &&
        row.playerInId === args.playerInId
    )
    .sort((a, b) => a.sequence - b.sequence);

  const match = pending[0];
  if (!match) return null;

  const now = Date.now();
  await ctx.db.patch(match._id, {
    status: "executed",
    executedAt: now,
    updatedAt: now,
  });
  return match._id;
}
