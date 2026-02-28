import { query } from "./_generated/server";
import { v } from "convex/values";

// Get match for referee (verify referee PIN via referees table + assignment)
export const getForReferee = query({
  args: { code: v.string(), pin: v.string() },
  handler: async (ctx, args) => {
    const referee = await ctx.db
      .query("referees")
      .withIndex("by_pin", (q) => q.eq("pin", args.pin))
      .first();
    if (!referee || !referee.active) return null;

    const match = await ctx.db
      .query("matches")
      .withIndex("by_code", (q) => q.eq("publicCode", args.code.toUpperCase()))
      .first();
    if (!match) return null;
    if (!match.refereeId || match.refereeId !== referee._id) return null;

    const team = await ctx.db.get(match.teamId);

    return {
      id: match._id,
      opponent: match.opponent,
      isHome: match.isHome,
      status: match.status,
      currentQuarter: match.currentQuarter,
      quarterCount: match.quarterCount,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      startedAt: match.startedAt,
      quarterStartedAt: match.quarterStartedAt,
      pausedAt: match.pausedAt,
      accumulatedPauseTime: match.accumulatedPauseTime,
      teamName: team?.name ?? "Team",
      refereeName: referee.name,
    };
  },
});

// Get all matches assigned to a referee (referee enters PIN → sees match list)
export const getMatchesForReferee = query({
  args: { pin: v.string() },
  handler: async (ctx, args) => {
    const referee = await ctx.db
      .query("referees")
      .withIndex("by_pin", (q) => q.eq("pin", args.pin))
      .first();
    if (!referee || !referee.active) return null;

    const matches = await ctx.db
      .query("matches")
      .withIndex("by_refereeId", (q) => q.eq("refereeId", referee._id))
      .collect();

    const enriched = await Promise.all(
      matches.map(async (m) => {
        const team = await ctx.db.get(m.teamId);
        return {
          id: m._id,
          publicCode: m.publicCode,
          opponent: m.opponent,
          isHome: m.isHome,
          status: m.status,
          currentQuarter: m.currentQuarter,
          quarterCount: m.quarterCount,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          scheduledAt: m.scheduledAt,
          startedAt: m.startedAt,
          finishedAt: m.finishedAt,
          teamName: team?.name ?? "Team",
        };
      })
    );

    const statusOrder: Record<string, number> = {
      live: 0,
      halftime: 1,
      lineup: 2,
      scheduled: 3,
      finished: 4,
    };
    enriched.sort(
      (a, b) => (statusOrder[a.status] ?? 5) - (statusOrder[b.status] ?? 5)
    );

    return {
      referee: { id: referee._id, name: referee.name },
      matches: enriched,
    };
  },
});
