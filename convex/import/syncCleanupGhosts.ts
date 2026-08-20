/**
 * One-off cleanup: remove scheduled ghost match rows from pre-#40 ms-precision keys.
 */
import { internalMutation } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { v } from "convex/values";

function amsterdamDateKey(ms: number | undefined): string {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "no-date";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

/**
 * A row is a ghost iff scheduled / 0-0 / never started, and a sibling on the
 * same (team, opponent, Amsterdam-day) is finished/live/halftime.
 */
export const cleanupScheduledGhosts = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;
    const matches = await ctx.db.query("matches").collect();

    const byKey = new Map<string, typeof matches>();
    for (const m of matches) {
      if (typeof m.scheduledAt !== "number") continue;
      const k = `${m.teamId}|${m.opponent.trim().toLowerCase()}|${amsterdamDateKey(m.scheduledAt)}`;
      const arr = byKey.get(k) ?? [];
      arr.push(m);
      byKey.set(k, arr);
    }

    const ghostIds: Id<"matches">[] = [];
    const details: Array<{
      key: string;
      ghostId: Id<"matches">;
      survivorId: Id<"matches">;
      survivorStatus: string;
    }> = [];

    for (const [key, group] of byKey.entries()) {
      if (group.length < 2) continue;
      const survivors = group.filter(
        (m) =>
          m.status === "finished" ||
          m.status === "live" ||
          m.status === "halftime",
      );
      if (survivors.length === 0) continue;

      const ghosts = group.filter(
        (m) =>
          m.status === "scheduled" &&
          m.homeScore === 0 &&
          m.awayScore === 0 &&
          !m.startedAt &&
          !m.finishedAt &&
          !m.cancelledAt,
      );

      for (const ghost of ghosts) {
        ghostIds.push(ghost._id);
        details.push({
          key,
          ghostId: ghost._id,
          survivorId: survivors[0]._id,
          survivorStatus: survivors[0].status,
        });
      }
    }

    let deletedMatchPlayers = 0;
    let deletedEvents = 0;
    let deletedDedupes = 0;

    if (!dryRun) {
      for (const ghostId of ghostIds) {
        const mps = await ctx.db
          .query("matchPlayers")
          .withIndex("by_match", (q) => q.eq("matchId", ghostId))
          .collect();
        for (const mp of mps) {
          await ctx.db.delete(mp._id);
          deletedMatchPlayers++;
        }

        const evs = await ctx.db
          .query("matchEvents")
          .withIndex("by_match", (q) => q.eq("matchId", ghostId))
          .collect();
        for (const e of evs) {
          await ctx.db.delete(e._id);
          deletedEvents++;
        }

        const dedupes = await ctx.db
          .query("matchCommandDedupes")
          .withIndex("by_match_command_correlation", (q) =>
            q.eq("matchId", ghostId),
          )
          .collect();
        for (const d of dedupes) {
          await ctx.db.delete(d._id);
          deletedDedupes++;
        }

        await ctx.db.delete(ghostId);
      }
    }

    return {
      dryRun,
      ghostsFound: ghostIds.length,
      deletedMatches: dryRun ? 0 : ghostIds.length,
      deletedMatchPlayers,
      deletedEvents,
      deletedDedupes,
      details: details.slice(0, 30),
    };
  },
});
