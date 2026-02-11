/**
 * Seed matches for JO12-1.
 */
import { ActionCtx } from "../_generated/server";
import { api, internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { generatePublicCode } from "./helpers";
import { MATCH_SCHEDULE } from "./seedData";

interface MatchResult {
  opponent: string;
  code: string;
  date: string;
  result: string | null;
}

/**
 * Create seed matches for the given team.
 * Assigns referees from `refereeMap` based on refereeSlug in the schedule.
 */
export async function seedMatchesForTeam(
  ctx: ActionCtx,
  teamId: Id<"teams">,
  coachPin: string,
  refereeMap: Record<string, Id<"referees">>,
): Promise<MatchResult[]> {
  // Get all players for this team
  const players = await ctx.runQuery(api.admin.listPlayersByTeam, { teamId });
  const results: MatchResult[] = [];

  for (const entry of MATCH_SCHEDULE) {
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
