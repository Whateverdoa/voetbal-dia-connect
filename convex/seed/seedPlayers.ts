/**
 * Seed players for a team.
 */
import { ActionCtx } from "../_generated/server";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { pickUniqueNames } from "./helpers";
import { PLAYERS_PER_TEAM, SEED_ADMIN_PIN } from "./seedData";

/** Sample positions for first 8 players using EN abbreviations. */
const SAMPLE_POSITIONS: Array<{ positionPrimary: string; positionSecondary?: string }> = [
  { positionPrimary: "GK" },
  { positionPrimary: "CB" },
  { positionPrimary: "RB" },
  { positionPrimary: "LB" },
  { positionPrimary: "CM" },
  { positionPrimary: "RM" },
  { positionPrimary: "CM", positionSecondary: "CAM" },
  { positionPrimary: "ST" },
];

/**
 * Create `PLAYERS_PER_TEAM` players for the given team.
 * Uses the shared name pool to avoid duplicates across teams.
 * First 8 get sample positions for field-view testing.
 */
export async function seedPlayersForTeam(
  ctx: ActionCtx,
  teamId: Id<"teams">,
  usedNames: Set<string>,
): Promise<number> {
  const names = pickUniqueNames(PLAYERS_PER_TEAM, usedNames);
  const players = names.map((name, i) => {
    const pos = SAMPLE_POSITIONS[i];
    return {
      name,
      number: i + 1,
      ...(pos && {
        positionPrimary: pos.positionPrimary,
        ...(pos.positionSecondary && { positionSecondary: pos.positionSecondary }),
      }),
    };
  });

  await ctx.runMutation(api.admin.createPlayers, {
    teamId,
    players,
    adminPin: SEED_ADMIN_PIN,
  });

  return players.length;
}
