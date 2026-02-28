import type { MutationCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

type ConsumeCommandIdempotencyArgs = {
  matchId: Id<"matches">;
  commandType: string;
  correlationId?: string;
};

/**
 * Returns false when this command was already accepted once.
 */
export async function consumeCommandIdempotency(
  ctx: MutationCtx,
  args: ConsumeCommandIdempotencyArgs
): Promise<boolean> {
  if (!args.correlationId) {
    throw new Error("correlationId is verplicht");
  }

  const existing = await ctx.db
    .query("matchCommandDedupes")
    .withIndex("by_match_command_correlation", (q) =>
      q
        .eq("matchId", args.matchId)
        .eq("commandType", args.commandType)
        .eq("correlationId", args.correlationId as string)
    )
    .first();

  if (existing) {
    return false;
  }

  await ctx.db.insert("matchCommandDedupes", {
    matchId: args.matchId,
    commandType: args.commandType,
    correlationId: args.correlationId,
    createdAt: Date.now(),
  });

  return true;
}
