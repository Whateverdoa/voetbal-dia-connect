/**
 * Import matches from parsed data.
 * Deduplicates on team + opponent + scheduledAt.
 *
 * Usage via CLI: npx convex run "import/importMatches:importMatchBatch" '{ ... }'
 */
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { generatePublicCode } from "../seed/helpers";
import { requireAdminOrOps } from "../lib/opsAuth";

export const importMatchBatch = mutation({
  args: {
    opsSecret: v.optional(v.string()),
    teamSlug: v.string(),
    coachEmail: v.optional(v.string()),
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
    await requireAdminOrOps(ctx, args.opsSecret);

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

    const coach = args.coachEmail
      ? await ctx.db
          .query("coaches")
          .withIndex("by_email", (q) => q.eq("email", args.coachEmail!.trim().toLowerCase()))
          .first()
      : (await ctx.db.query("coaches").collect()).find((entry) => entry.teamIds.includes(team._id));

    if (!coach || !coach.teamIds.includes(team._id)) {
      return {
        error: `Geen coach gevonden voor team '${args.teamSlug}'`,
        created: 0,
        skipped: 0,
      };
    }

    const existing = await ctx.db
      .query("matches")
      .withIndex("by_team", (q) => q.eq("teamId", team._id))
      .collect();

    const existingKeys = new Set(
      existing.map((match) => `${match.opponent}|${match.scheduledAt}`),
    );

    const details = [];
    let created = 0;
    let skipped = 0;

    for (const match of args.matches) {
      const scheduledAt = new Date(match.date).getTime();
      const key = `${match.opponent}|${scheduledAt}`;

      if (existingKeys.has(key)) {
        details.push({ opponent: match.opponent, date: match.date, status: "skipped" });
        skipped++;
        continue;
      }

      if (!args.dryRun) {
        const isFinished = match.finished ?? false;
        await ctx.db.insert("matches", {
          teamId: team._id,
          publicCode: generatePublicCode(),
          coachId: coach._id,
          opponent: match.opponent,
          isHome: match.isHome,
          scheduledAt,
          status: isFinished ? "finished" : "scheduled",
          currentQuarter: isFinished ? 4 : 1,
          quarterCount: 4,
          homeScore: match.homeScore ?? 0,
          awayScore: match.awayScore ?? 0,
          showLineup: false,
          startedAt: isFinished ? scheduledAt : undefined,
          finishedAt: isFinished ? scheduledAt + 3600000 : undefined,
          createdAt: Date.now(),
        });
      }

      details.push({ opponent: match.opponent, date: match.date, status: "created" });
      created++;
    }

    return {
      teamSlug: args.teamSlug,
      teamName: team.name,
      coachEmail: coach.email,
      dryRun: args.dryRun,
      created,
      skipped,
      details,
    };
  },
});
