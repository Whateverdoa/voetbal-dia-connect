/**
 * TSC O13-2 — DIA JO13-2: equal playing minutes for everyone except
 * injured Luuk Sinnige. Wissels in de 2e helft zijn onbekend.
 *
 * npx convex run ops/equalizeTscJo132Minutes:apply '{"opsSecret":"..."}'
 */
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { requireAdminOrOps } from "../lib/opsAuth";
import { equalShareMinutes } from "../lib/lateMatchRoster";

const MATCH_ID = "jn79bppqctkefgbjpe3kyx4f218cvy6f" as Id<"matches">;
const LUUK_ID = "js72r5j1kqkxvfvvgrhhfsyhcs8bqtva" as Id<"players">;
const ON_FIELD_COUNT = 11;

export const apply = mutation({
  args: { opsSecret: v.optional(v.string()) },
  returns: v.object({
    minutesEach: v.number(),
    equalized: v.array(v.string()),
    injured: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    await requireAdminOrOps(ctx, args.opsSecret);

    const match = await ctx.db.get(MATCH_ID);
    if (!match) throw new Error("Wedstrijd TSC–JO13-2 niet gevonden");

    const matchPlayers = await ctx.db
      .query("matchPlayers")
      .withIndex("by_match", (q) => q.eq("matchId", MATCH_ID))
      .collect();

    const available = matchPlayers.filter((row) => row.playerId !== LUUK_ID);
    const minutesEach = equalShareMinutes(
      ON_FIELD_COUNT,
      match.regulationDurationMinutes ?? 60,
      available.length,
    );

    const equalized: string[] = [];
    const injured: string[] = [];

    for (const row of matchPlayers) {
      const player = await ctx.db.get(row.playerId);
      const name = player?.name ?? String(row.playerId);
      if (row.playerId === LUUK_ID) {
        await ctx.db.patch(row._id, {
          minutesPlayed: 0,
          onField: false,
          absent: true,
          lastSubbedInAt: undefined,
        });
        injured.push(name);
        continue;
      }

      await ctx.db.patch(row._id, {
        minutesPlayed: minutesEach,
        lastSubbedInAt: undefined,
      });
      equalized.push(name);
    }

    equalized.sort((a, b) => a.localeCompare(b));
    return { minutesEach, equalized, injured };
  },
});
