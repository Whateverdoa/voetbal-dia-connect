/**
 * Import matches from parsed data.
 * Deduplicates on team + opponent + scheduledAt.
 *
 * Usage via CLI: npx convex run "import/importMatches:importMatchBatch" '{ ... }'
 */
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { verifyAdminPin } from "../adminAuth";
import { generatePublicCode } from "../seed/helpers";

export const importMatchBatch = mutation({
  args: {
    adminPin: v.string(),
    teamSlug: v.string(),
    coachPin: v.string(),
    matches: v.array(
      v.object({
        opponent: v.string(),
        date: v.string(),
        isHome: v.boolean(),
        finished: v.optional(v.boolean()),
        homeScore: v.optional(v.number()),
        awayScore: v.optional(v.number()),
      }),
    ),
    dryRun: v.boolean(),
  },
  handler: async (ctx, args) => {
    verifyAdminPin(args.adminPin);

    const team = await ctx.db
      .query("teams")
      .withIndex("by_slug_only", (q) => q.eq("slug", args.teamSlug))
      .unique();

    if (!team) {
      return {
        error: `Team '${args.teamSlug}' niet gevonden`,
        created: 0,
        skipped: 0,
      };
    }

    const existing = await ctx.db
      .query("matches")
      .withIndex("by_team", (q) => q.eq("teamId", team._id))
      .collect();

    const existingKeys = new Set(
      existing.map((m) => `${m.opponent}|${m.scheduledAt}`),
    );

    const details = [];
    let created = 0;
    let skipped = 0;

    for (const m of args.matches) {
      const scheduledAt = new Date(m.date).getTime();
      const key = `${m.opponent}|${scheduledAt}`;

      if (existingKeys.has(key)) {
        details.push({ opponent: m.opponent, date: m.date, status: "skipped" });
        skipped++;
        continue;
      }

      if (!args.dryRun) {
        const isFinished = m.finished ?? false;
        await ctx.db.insert("matches", {
          teamId: team._id,
          publicCode: generatePublicCode(),
          coachPin: args.coachPin,
          opponent: m.opponent,
          isHome: m.isHome,
          scheduledAt,
          status: isFinished ? "finished" : "scheduled",
          currentQuarter: isFinished ? 4 : 1,
          quarterCount: 4,
          homeScore: m.homeScore ?? 0,
          awayScore: m.awayScore ?? 0,
          showLineup: false,
          startedAt: isFinished ? scheduledAt : undefined,
          finishedAt: isFinished ? scheduledAt + 3600000 : undefined,
          createdAt: Date.now(),
        });
      }

      details.push({ opponent: m.opponent, date: m.date, status: "created" });
      created++;
    }

    return {
      teamSlug: args.teamSlug,
      teamName: team.name,
      dryRun: args.dryRun,
      created,
      skipped,
      details,
    };
  },
});
