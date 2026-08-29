/**
 * Set JO13-2 active roster = selectie-6 + JO12-1 movers (except Bora/Jip/Devan).
 * npx convex run ops/setJo132ActiveRoster:apply '{"opsSecret":"..."}'
 */
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { requireAdminOrOps } from "../lib/opsAuth";
import type { Id } from "../_generated/dataModel";

const JO132 = "jx70f085h033v0edc8jvqd99n582xmma" as Id<"teams">;

/** Prefer these player docs (on JO13-2 or move onto it). */
const KEEP_NAMES = [
  "Tygo Verhoeven",
  "Krijn van den Hoven",
  "Lucas van Loo",
  "Miloud Karmous",
  "Jody van der Bijl",
  "Luuk Sinnige",
  // from JO12-1 (except Bora, Jip, Devan)
  "Loek van der Burgt",
  "Luc van Haperen",
  "Lukas ten Hoonte",
  "Maceo Leiwakabessy",
  "Max Nieuwenhuizen",
  "Olivier van Vooren",
  "Revi Hendriks",
  "Sem Smit",
];

function norm(n: string) {
  return n.toLowerCase().trim().replace(/\s+/g, " ");
}

export const apply = mutation({
  args: { opsSecret: v.optional(v.string()) },
  returns: v.object({
    active: v.array(v.string()),
    deactivated: v.array(v.string()),
    moved: v.array(v.string()),
  }),
  handler: async (ctx, args) => {
    await requireAdminOrOps(ctx, args.opsSecret);
    const keep = new Set(KEEP_NAMES.map(norm));
    const allPlayers = await ctx.db.query("players").collect();

    const active: string[] = [];
    const deactivated: string[] = [];
    const moved: string[] = [];

    // Ensure one active copy per keep-name on JO13-2.
    for (const name of KEEP_NAMES) {
      const key = norm(name);
      const candidates = allPlayers.filter((p) => norm(p.name) === key);
      let on132 = candidates.find((p) => p.teamId === JO132);
      if (!on132 && candidates[0]) {
        on132 = candidates[0];
        await ctx.db.patch(on132._id, { teamId: JO132, active: true });
        moved.push(name);
      } else if (on132) {
        await ctx.db.patch(on132._id, { teamId: JO132, active: true });
      } else {
        await ctx.db.insert("players", {
          teamId: JO132,
          name,
          active: true,
          createdAt: Date.now(),
        });
        moved.push(`${name} (nieuw)`);
      }
      active.push(name);

      // Deactivate other copies of the same person elsewhere / duplicates on 132.
      for (const c of candidates) {
        if (on132 && c._id === on132._id) continue;
        if (c.active || c.teamId === JO132) {
          await ctx.db.patch(c._id, { active: false });
        }
      }
    }

    // Deactivate anyone else still active on JO13-2.
    const onTeam = await ctx.db
      .query("players")
      .withIndex("by_team", (q) => q.eq("teamId", JO132))
      .collect();
    for (const p of onTeam) {
      if (!p.active) continue;
      if (keep.has(norm(p.name))) continue;
      await ctx.db.patch(p._id, { active: false });
      deactivated.push(p.name);
    }

    return {
      active: active.sort(),
      deactivated: deactivated.sort(),
      moved: moved.sort(),
    };
  },
});
