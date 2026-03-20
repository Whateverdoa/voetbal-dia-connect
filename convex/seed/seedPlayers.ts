/**
 * Seed players for a team - real rosters preferred, random fallback.
 */
import { ActionCtx } from "../_generated/server";
import { internal } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { pickUniqueNames } from "./helpers";
import { PLAYERS_PER_TEAM } from "./seedData";
import { REAL_PLAYER_ROSTERS } from "./realData";

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

export async function seedPlayersForTeam(
  ctx: ActionCtx,
  teamId: Id<"teams">,
  teamSlug: string,
  usedNames: Set<string>,
): Promise<number> {
  const roster = REAL_PLAYER_ROSTERS[teamSlug];

  if (roster) {
    const players = roster.map((name, index) => ({ name, number: index + 1 }));

    await ctx.runMutation(internal.seed.createSeedPlayers, {
      teamId,
      players,
    });
    return players.length;
  }

  const names = pickUniqueNames(PLAYERS_PER_TEAM, usedNames);
  const players = names.map((name, index) => {
    const position = SAMPLE_POSITIONS[index];
    return {
      name,
      number: index + 1,
      ...(position && {
        positionPrimary: position.positionPrimary,
        ...(position.positionSecondary && { positionSecondary: position.positionSecondary }),
      }),
    };
  });

  await ctx.runMutation(internal.seed.createSeedPlayers, {
    teamId,
    players,
  });

  return players.length;
}
