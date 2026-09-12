/**
 * Pure helpers for matching live substitutions to pending plan rows.
 * Kept outside Convex so Vitest can cover reconciliation without a backend.
 */
export type PendingPlanLike = {
  _id: string;
  sequence: number;
  status: string;
  kind?: "substitution" | "positionSwap" | null;
  playerOutId: string;
  playerInId: string;
};

export function findMatchingPendingPlanId(
  plans: ReadonlyArray<PendingPlanLike>,
  args: {
    playerOutId: string;
    playerInId: string;
    kind?: "substitution" | "positionSwap";
  }
): string | null {
  const kind = args.kind ?? "substitution";
  const pending = plans
    .filter((row) => row.status === "pending")
    .filter((row) => (row.kind ?? "substitution") === kind)
    .filter(
      (row) =>
        row.playerOutId === args.playerOutId &&
        row.playerInId === args.playerInId
    )
    .sort((a, b) => a.sequence - b.sequence);

  return pending[0]?._id ?? null;
}
