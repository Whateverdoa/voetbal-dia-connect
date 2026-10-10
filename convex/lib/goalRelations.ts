import type { MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

export async function removeGoalRelations(ctx: MutationCtx, goal: Doc<"matchEvents">, events: Doc<"matchEvents">[]) {
  for (const event of events) {
    if ((event.type === "assist" || event.type === "goal_enrichment") && (
      event.targetEventId === goal._id || (event.type === "assist" && !!goal.correlationId && event.correlationId === goal.correlationId)
    )) await ctx.db.delete(event._id);
  }
}
