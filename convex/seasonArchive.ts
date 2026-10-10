/**
 * Archive a football season: export snapshot + purge match rows (cascade).
 *
 *   npx convex run seasonArchive:exportMatches '{"opsSecret":"...","seasonKey":"2025-2026"}'
 *   npx convex run seasonArchive:purgeBatch '{"opsSecret":"...","seasonKey":"2025-2026","limit":25}'
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdminOrOps } from "./lib/opsAuth";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";

const matchExportV = v.object({
  _id: v.id("matches"),
  publicCode: v.string(),
  teamId: v.id("teams"),
  opponent: v.string(),
  isHome: v.boolean(),
  scheduledAt: v.union(v.number(), v.null()),
  status: v.string(),
  homeScore: v.number(),
  awayScore: v.number(),
  seasonKey: v.union(v.string(), v.null()),
  sportlinkWedstrijdcode: v.optional(v.string()),
  finishedAt: v.optional(v.number()),
  createdAt: v.number(),
});

export const exportMatches = query({
  args: {
    seasonKey: v.string(),
    opsSecret: v.optional(v.string()),
  },
  returns: v.object({
    seasonKey: v.string(),
    exportedAt: v.string(),
    count: v.number(),
    matches: v.array(matchExportV),
  }),
  handler: async (ctx, args) => {
    await requireAdminOrOps(ctx, args.opsSecret);
    const all = await ctx.db.query("matches").collect();
    const matches = all
      .filter((m) => m.seasonKey === args.seasonKey)
      .map((m) => ({
        _id: m._id,
        publicCode: m.publicCode,
        teamId: m.teamId,
        opponent: m.opponent,
        isHome: m.isHome,
        scheduledAt: m.scheduledAt ?? null,
        status: m.status,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        seasonKey: m.seasonKey ?? null,
        sportlinkWedstrijdcode: m.sportlinkWedstrijdcode,
        finishedAt: m.finishedAt,
        createdAt: m.createdAt,
      }));
    return {
      seasonKey: args.seasonKey,
      exportedAt: new Date().toISOString(),
      count: matches.length,
      matches,
    };
  },
});

export const countBySeason = query({
  args: { opsSecret: v.optional(v.string()) },
  returns: v.record(v.string(), v.number()),
  handler: async (ctx, args) => {
    await requireAdminOrOps(ctx, args.opsSecret);
    const all = await ctx.db.query("matches").collect();
    const counts: Record<string, number> = {};
    for (const m of all) {
      const key = m.seasonKey ?? "(missing)";
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  },
});

async function cascadeDeleteMatch(ctx: MutationCtx, matchId: Id<"matches">) {
  let children = 0;
  const childTables = [
    "matchPlayers",
    "matchEvents",
    "matchStoppages",
    "substitutionPlans",
  ] as const;

  for (const table of childTables) {
    const rows = await ctx.db
      .query(table)
      .withIndex("by_match", (q) => q.eq("matchId", matchId))
      .collect();
    for (const row of rows) {
      await ctx.db.delete(row._id);
      children++;
    }
  }

  const dedupes = await ctx.db
    .query("matchCommandDedupes")
    .withIndex("by_match_command_correlation", (q) => q.eq("matchId", matchId))
    .collect();
  for (const d of dedupes) {
    await ctx.db.delete(d._id);
    children++;
  }

  await ctx.db.delete(matchId);
  return children;
}

/** Delete up to `limit` matches for a season (cascade). Repeat until remaining=0. */
export const purgeBatch = mutation({
  args: {
    seasonKey: v.string(),
    limit: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
    opsSecret: v.optional(v.string()),
  },
  returns: v.object({
    dryRun: v.boolean(),
    deletedMatches: v.number(),
    deletedChildren: v.number(),
    remaining: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireAdminOrOps(ctx, args.opsSecret);
    const dryRun = args.dryRun ?? true;
    const limit = Math.min(Math.max(args.limit ?? 25, 1), 50);

    const all = await ctx.db.query("matches").collect();
    const targets = all
      .filter((m) => m.seasonKey === args.seasonKey)
      .slice(0, limit);
    const remainingBefore = all.filter((m) => m.seasonKey === args.seasonKey)
      .length;

    if (dryRun) {
      return {
        dryRun: true,
        deletedMatches: targets.length,
        deletedChildren: 0,
        remaining: remainingBefore,
      };
    }

    let deletedChildren = 0;
    for (const m of targets) {
      deletedChildren += await cascadeDeleteMatch(ctx, m._id);
    }

    const after = await ctx.db.query("matches").collect();
    const remaining = after.filter((m) => m.seasonKey === args.seasonKey).length;

    return {
      dryRun: false,
      deletedMatches: targets.length,
      deletedChildren,
      remaining,
    };
  },
});
