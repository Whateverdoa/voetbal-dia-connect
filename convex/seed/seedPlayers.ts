/**
 * Seed players for a team.
 */
import { ActionCtx } from "../_generated/server";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { pickUniqueNames, DUTCH_NAMES } from "./helpers";
import { PLAYERS_PER_TEAM, SEED_ADMIN_PIN } from "./seedData";

/**
 * Create `PLAYERS_PER_TEAM` players for the given team.
 * Uses the shared name pool to avoid duplicates across teams.
 */
export async function seedPlayersForTeam(
  ctx: ActionCtx,
  teamId: Id<"teams">,
  usedNames: Set<string>,
): Promise<number> {
  const names = pickUniqueNames(PLAYERS_PER_TEAM, usedNames);
  const players = names.map((name, i) => ({
    name,
    number: i + 1, // Shirt numbers 1-14
  }));

  await ctx.runMutation(api.admin.createPlayers, {
    teamId,
    players,
    adminPin: SEED_ADMIN_PIN,
  });

  return players.length;
}
