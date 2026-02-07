/**
 * Shared playing time helpers used by matchActions, matchEvents, and matchLineup.
 * Centralized to prevent drift between duplicate implementations.
 */
import { Doc, Id } from "./_generated/dataModel";
import { MutationCtx } from "./_generated/server";

/**
 * Record accumulated playing time for a player and clear their lastSubbedInAt.
 * Called when a player leaves the field (sub out, quarter end, match end).
 */
export async function recordPlayingTime(
  ctx: MutationCtx,
  matchPlayer: Doc<"matchPlayers">,
  endTime: number
): Promise<void> {
  if (!matchPlayer.lastSubbedInAt) return;

  const minutesThisSession = (endTime - matchPlayer.lastSubbedInAt) / 60000;
  const totalMinutes = (matchPlayer.minutesPlayed ?? 0) + minutesThisSession;

  await ctx.db.patch(matchPlayer._id, {
    minutesPlayed: Math.round(totalMinutes * 10) / 10,
    lastSubbedInAt: undefined,
  });
}

/**
 * Mark a player as on-field and start tracking their playing time.
 * Called when a player enters the field (sub in, match start, quarter start).
 */
export async function startPlayingTime(
  ctx: MutationCtx,
  matchPlayerId: Id<"matchPlayers">,
  startTime: number
): Promise<void> {
  await ctx.db.patch(matchPlayerId, {
    onField: true,
    lastSubbedInAt: startTime,
  });
}
