import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { redactPlayerForPublic } from "./privacyFilter";

export async function readPublicPlayer(
  ctx: QueryCtx,
  player: Doc<"players"> | null,
  teamId?: Id<"teams">,
) {
  if (!player || (teamId && player.teamId !== teamId)) return null;
  const team = await ctx.db.get(player.teamId);
  const source = player.sportlinkPublic;
  if (
    !team ||
    !source ||
    !player.sportlinkPersonId ||
    source.personId !== player.sportlinkPersonId ||
    source.teamId !== team._id ||
    source.teamCode !== team.sportlinkTeamCode ||
    source.generation !== team.sportlinkPrivacyGeneration ||
    !team.sportlinkPrivacyValidUntil ||
    team.sportlinkPrivacyValidUntil <= Date.now()
  )
    return null;
  const consents = await ctx.db
    .query("playerConsents")
    .withIndex("by_player", (q) => q.eq("playerId", player._id))
    .take(100);
  // A suspiciously large consent set is not evidence of permission.
  if (consents.length === 100) return null;
  const publicPlayer = redactPlayerForPublic(
    { ...player, sourceName: source.name, sourcePhotoUrl: source.photoUrl },
    consents,
  );
  return publicPlayer.showFullIdentity ? publicPlayer : null;
}
