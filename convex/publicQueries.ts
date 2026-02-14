/**
 * Public queries — unauthenticated, read-only views for spectators.
 *
 * These queries NEVER return coachPin, refereeId, or other sensitive fields.
 */
import { query } from "./_generated/server";

// List all publicly visible matches, enriched with team/club names.
export const listPublicMatches = query({
  args: {},
  handler: async (ctx) => {
    // Note: acceptable for small club. Paginate if match count grows.
    const allMatches = await ctx.db.query("matches").collect();

    // Exclude "lineup" — that's pre-match setup, not public
    const visibleStatuses = new Set(["scheduled", "live", "halftime", "finished"]);
    const matches = allMatches.filter((m) => visibleStatuses.has(m.status));

    // Enrich each match with team name and club name
    const enriched = await Promise.all(
      matches.map(async (m) => {
        const team = await ctx.db.get(m.teamId);
        const club = team ? await ctx.db.get(team.clubId) : null;

        return {
          _id: m._id,
          publicCode: m.publicCode,
          opponent: m.opponent,
          isHome: m.isHome,
          status: m.status,
          homeScore: m.homeScore,
          awayScore: m.awayScore,
          currentQuarter: m.currentQuarter,
          quarterCount: m.quarterCount,
          scheduledAt: m.scheduledAt,
          teamName: team?.name ?? "Team",
          clubName: club?.name ?? "Club",
        };
      }),
    );

    // Sort: live/halftime first, then scheduled (newest first), then finished
    const statusOrder: Record<string, number> = {
      live: 0,
      halftime: 1,
      scheduled: 2,
      finished: 3,
    };

    enriched.sort((a, b) => {
      const orderDiff = (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9);
      if (orderDiff !== 0) return orderDiff;
      // Within the same status group, newest scheduledAt first
      return (b.scheduledAt ?? 0) - (a.scheduledAt ?? 0);
    });

    return enriched;
  },
});
