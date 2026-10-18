import { ConvexError } from "convex/values";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

export function officialPlayerMinutes(row: Doc<"matchPlayers">, elapsedMs: number): number {
  const openMs = row.onField && !row.dismissed && row.officialEnteredElapsedMs !== undefined
    ? Math.max(0, elapsedMs - row.officialEnteredElapsedMs) : 0;
  return (row.minutesPlayed ?? 0) + openMs / 60_000;
}

/** Materialize intervals against match elapsed time, never wall time. Unknown
 * legacy intervals are not invented; only known anchors can accrue minutes. */
export async function syncRefereePlayingTime(ctx: MutationCtx, match: Doc<"matches">,
  elapsedMs: number, running: boolean, now: number) {
  const rows = await ctx.db.query("matchPlayers")
    .withIndex("by_match", q => q.eq("matchId", match._id)).take(101);
  if (rows.length > 100) throw new ConvexError("RESOURCE_LIMIT");
  for (const row of rows) {
    const active = running && row.onField && !row.dismissed && !row.absent && !row.injured;
    await ctx.db.patch(row._id, {
      minutesPlayed: officialPlayerMinutes(row, elapsedMs),
      officialEnteredElapsedMs: active ? elapsedMs : undefined,
      lastSubbedInAt: active ? row.lastSubbedInAt ?? now : undefined,
    });
  }
}
