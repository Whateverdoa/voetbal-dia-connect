import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { CardRecognition } from "../../src/lib/cards/fc27";

/** Bounded award history. Consumers derive active bonuses from expiresAt. */
export async function loadTeamRecognitions(ctx: MutationCtx | QueryCtx, teamId: Id<"teams">): Promise<Map<string, CardRecognition[]>> {
  const result = new Map<string, CardRecognition[]>();
  const team = await ctx.db.get(teamId);
  if (!team?.isSelectionTeam) return result;
  const rounds = await ctx.db.query("cardRounds").withIndex("by_team", (q) => q.eq("teamId", teamId)).order("desc").take(100);
  for (const round of rounds) {
    if (round.status !== "published" || round.publishedAt == null || round.expiresAt == null) continue;
    for (const playerId of round.winnerIds) {
      const awards = result.get(String(playerId)) ?? [];
      awards.push({ roundId: String(round._id), kind: round.kind, periodKey: round.periodKey, publishedAt: round.publishedAt, expiresAt: round.expiresAt });
      result.set(String(playerId), awards);
    }
  }
  return result;
}
