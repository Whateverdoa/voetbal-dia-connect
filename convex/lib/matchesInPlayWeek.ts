/**
 * Shared match collection for a play week (admin + pool).
 */
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { seasonKeyFromMs } from "./season";

export async function matchesInPlayWeek(
  ctx: QueryCtx | MutationCtx,
  weekStartMs: number,
  weekEndMs: number
): Promise<Doc<"matches">[]> {
  const seasonKey = seasonKeyFromMs(weekStartMs);
  const bySeason = await ctx.db
    .query("matches")
    .withIndex("by_season", (q) => q.eq("seasonKey", seasonKey))
    .collect();
  const scheduled = await ctx.db
    .query("matches")
    .withIndex("by_status", (q) => q.eq("status", "scheduled"))
    .collect();
  const lineup = await ctx.db
    .query("matches")
    .withIndex("by_status", (q) => q.eq("status", "lineup"))
    .collect();

  const byId = new Map<string, Doc<"matches">>();
  for (const m of [...bySeason, ...scheduled, ...lineup]) {
    byId.set(m._id, m);
  }

  return [...byId.values()].filter(
    (m) =>
      !m.cancelledAt &&
      m.scheduledAt !== undefined &&
      m.scheduledAt >= weekStartMs &&
      m.scheduledAt < weekEndMs
  );
}
