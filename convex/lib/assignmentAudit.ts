import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type ReaderCtx = QueryCtx | MutationCtx;

export async function getAssignmentAuditByCorrelation(
  ctx: ReaderCtx,
  clubId: Id<"clubs">,
  correlationId: string
) {
  return await ctx.db
    .query("assignmentAuditEvents")
    .withIndex("by_club_and_correlation", (q) =>
      q.eq("clubId", clubId).eq("correlationId", correlationId)
    )
    .unique();
}

export function requireMatchingReplay(
  audit: { actorUserId?: Id<"appUsers">; metadata?: Record<string, unknown> },
  actorUserId: Id<"appUsers">,
  inputFingerprint: string
) {
  if (
    audit.actorUserId !== actorUserId ||
    audit.metadata?.inputFingerprint !== inputFingerprint
  ) {
    throw new Error("IDEMPOTENCY_CONFLICT");
  }
}
