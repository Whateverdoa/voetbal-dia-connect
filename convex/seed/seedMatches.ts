/**
 * Seed matches per team — uses per-team schedule or default MATCH_SCHEDULE.
 */
import { ActionCtx } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { generatePublicCode } from "./helpers";
import { MATCH_SCHEDULE } from "./seedData";
import type { SeedMatch } from "./seedData";

interface MatchResult {
  opponent: string;
  code: string;
  date: string;
  result: string | null;
}

/**
 * Create seed matches for the given team.
 * Uses `schedule` when provided, otherwise MATCH_SCHEDULE (JO12-1).
 * Assigns referees from refereeMap based on refereeSlug in the schedule.
 */
export async function seedMatchesForTeam(
  ctx: ActionCtx,
  teamId: Id<"teams">,
  coachPin: string,
  refereeMap: Record<string, Id<"referees">>,
  schedule?: SeedMatch[],
): Promise<MatchResult[]> {
  const entries = schedule ?? MATCH_SCHEDULE;
  const players = await ctx.runQuery(api.admin.listPlayersByTeam, { teamId });
  const results: MatchResult[] = [];

  for (const entry of entries) {
    const publicCode = generatePublicCode();
    const scheduledAt = new Date(entry.date).getTime();

    const matchId = await ctx.runMutation(internal.seed.createSeedMatch, {
      teamId,
      publicCode,
      coachPin,
      opponent: entry.opponent,
      isHome: entry.isHome,
      scheduledAt,
      finished: entry.finished ?? false,
      homeScore: entry.homeScore ?? 0,
      awayScore: entry.awayScore ?? 0,
      refereeId: entry.refereeSlug ? (refereeMap[entry.refereeSlug] ?? undefined) : undefined,
    });

    // Add all players to match
    for (const player of players) {
      await ctx.runMutation(internal.seed.addPlayerToMatch, {
        matchId,
        playerId: player._id,
      });
    }

    results.push({
      opponent: entry.opponent,
      code: publicCode,
      date: entry.date,
      result: entry.finished ? `${entry.homeScore ?? 0}-${entry.awayScore ?? 0}` : null,
    });
  }

  return results;
}
