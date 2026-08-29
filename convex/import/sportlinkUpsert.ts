/**
 * Sportlink import scaffolding.
 * When SPORTLINK_CLIENT_ID is configured, fetchAndStage can replace VoetbalAssist
 * in resultsFetch. Match key: sportlinkWedstrijdcode.
 */
import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireAdminOrOps } from "../lib/opsAuth";
import { seasonKeyFromMs } from "../lib/season";
import { generatePublicCode } from "../seed/helpers";

/**
 * Upsert a staged Sportlink fixture into matches by sportlinkWedstrijdcode.
 * Idempotent: same code updates scheduledAt / score instead of creating duplicates.
 */
export const upsertBySportlinkCode = mutation({
  args: {
    opsSecret: v.optional(v.string()),
    dryRun: v.optional(v.boolean()),
    teamSlug: v.string(),
    sportlinkWedstrijdcode: v.string(),
    opponent: v.string(),
    isHome: v.boolean(),
    scheduledAt: v.number(),
    homeScore: v.optional(v.number()),
    awayScore: v.optional(v.number()),
    finished: v.optional(v.boolean()),
  },
  returns: v.object({
    dryRun: v.boolean(),
    action: v.union(
      v.literal("created"),
      v.literal("updated"),
      v.literal("skipped_unknown_team")
    ),
    matchId: v.optional(v.id("matches")),
  }),
  handler: async (ctx, args) => {
    await requireAdminOrOps(ctx, args.opsSecret);
    const dryRun = args.dryRun ?? true;
    const code = args.sportlinkWedstrijdcode.trim();
    if (!code) throw new Error("sportlinkWedstrijdcode is verplicht");

    const team = await ctx.db
      .query("teams")
      .withIndex("by_slug_only", (q) => q.eq("slug", args.teamSlug))
      .first();
    if (!team) {
      return { dryRun, action: "skipped_unknown_team" as const };
    }

    const existing = await ctx.db
      .query("matches")
      .withIndex("by_sportlink_code", (q) => q.eq("sportlinkWedstrijdcode", code))
      .first();

    const finished = args.finished ?? false;
    const seasonKey = seasonKeyFromMs(args.scheduledAt);

    if (existing) {
      if (!dryRun) {
        await ctx.db.patch(existing._id, {
          scheduledAt: args.scheduledAt,
          seasonKey,
          opponent: args.opponent.trim(),
          isHome: args.isHome,
          ...(finished
            ? {
                status: "finished" as const,
                homeScore: args.homeScore ?? existing.homeScore,
                awayScore: args.awayScore ?? existing.awayScore,
              }
            : {}),
        });
      }
      return { dryRun, action: "updated" as const, matchId: existing._id };
    }

    if (dryRun) {
      return { dryRun, action: "created" as const };
    }

    const publicCode = generatePublicCode();
    const matchId = await ctx.db.insert("matches", {
      teamId: team._id,
      publicCode,
      opponent: args.opponent.trim(),
      isHome: args.isHome,
      scheduledAt: args.scheduledAt,
      seasonKey,
      sportlinkWedstrijdcode: code,
      status: finished ? "finished" : "scheduled",
      currentQuarter: finished ? 4 : 1,
      quarterCount: 4,
      homeScore: finished ? (args.homeScore ?? 0) : 0,
      awayScore: finished ? (args.awayScore ?? 0) : 0,
      showLineup: false,
      useBreakClock: true,
      breakClockAutoStart: true,
      createdAt: Date.now(),
    });

    return { dryRun, action: "created" as const, matchId };
  },
});

/** Debug: count matches keyed by Sportlink code. */
export const countSportlinkKeyed = query({
  args: {},
  returns: v.object({ withCode: v.number(), total: v.number() }),
  handler: async (ctx) => {
    const all = await ctx.db.query("matches").collect();
    const withCode = all.filter((m) => !!m.sportlinkWedstrijdcode).length;
    return { withCode, total: all.length };
  },
});
