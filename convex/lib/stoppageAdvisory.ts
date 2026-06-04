import type { QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

export async function getStoppageAdvisoryMs(
  ctx: QueryCtx,
  matchId: Id<"matches">,
  now: number
): Promise<number> {
  const stoppages = await ctx.db
    .query("matchStoppages")
    .withIndex("by_match", (q) => q.eq("matchId", matchId))
    .collect();

  return stoppages.reduce((total, stoppage) => {
    const end = stoppage.endedAt ?? now;
    return total + Math.max(0, end - stoppage.startedAt);
  }, 0);
}
