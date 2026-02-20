/**
 * Seed players for a team — real rosters preferred, random fallback.
 */
import { ActionCtx } from "../_generated/server";
import { api } from "../_generated/api";
import { Id } from "../_generated/dataModel";
import { pickUniqueNames } from "./helpers";
import { PLAYERS_PER_TEAM, SEED_ADMIN_PIN } from "./seedData";
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

/**
 * Create players for the given team.
 * Uses real roster from CSV when available; falls back to random Dutch names.
 * Real rosters get NO positions — coaches fill those in via the app.
 */
export async function seedPlayersForTeam(
  ctx: ActionCtx,
  teamId: Id<"teams">,
  teamSlug: string,
  usedNames: Set<string>,
): Promise<number> {
  const roster = REAL_PLAYER_ROSTERS[teamSlug];

  if (roster) {
    const players = roster.map((name, i) => ({ name, number: i + 1 }));

    await ctx.runMutation(api.admin.createPlayers, {
      teamId,
      players,
      adminPin: SEED_ADMIN_PIN,
    });
    return players.length;
  }

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
