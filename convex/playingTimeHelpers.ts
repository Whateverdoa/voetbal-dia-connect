/**
 * Shared playing time helpers used by matchActions, matchEvents, and matchLineup.
 * Centralized to prevent drift between duplicate implementations.
 */
import { Doc, Id } from "./_generated/dataModel";
import { MutationCtx } from "./_generated/server";
import { projectRefereeClock } from "./lib/refereeMatchPolicy";
import { playingElapsedMs } from "./lib/officialMatchClock";
import { officialPlayerMinutes } from "./lib/refereePlayingTime";
import { throwIfUnavailable } from "./lib/matchPlayerAvailability";

export function playerMinutesAt(match: Doc<"matches">, row: Doc<"matchPlayers">, now: number): number {
  const clock = projectRefereeClock(match, now)?.state;
  if (clock) return officialPlayerMinutes(row, playingElapsedMs(clock, now));
  return (row.minutesPlayed ?? 0) + (row.onField && row.lastSubbedInAt &&
    match.status === "live" && match.activeStoppageStartedAt == null
    ? (now - row.lastSubbedInAt) / 60_000 : 0);
}

/**
 * Record accumulated playing time for a player and clear their lastSubbedInAt.
 * Called when a player leaves the field (sub out, quarter end, match end).
 */
export async function recordPlayingTime(
  ctx: MutationCtx,
  matchPlayer: Doc<"matchPlayers">,
  endTime: number
): Promise<void> {
  const match = await ctx.db.get(matchPlayer.matchId);
  if (match?.refereePolicy) {
    await ctx.db.patch(matchPlayer._id, { minutesPlayed: playerMinutesAt(match, matchPlayer, endTime),
      lastSubbedInAt: undefined, officialEnteredElapsedMs: undefined });
    return;
  }
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
  const row = await ctx.db.get(matchPlayerId);
  if (!row) throw new Error("Speler niet in deze wedstrijd");
  const match = await ctx.db.get(row.matchId);
  const clock = match ? projectRefereeClock(match, startTime)?.state : undefined;
  if (clock) {
    throwIfUnavailable(row, "sub");
    const running = match!.status === "live" && clock.runningSince !== null;
    await ctx.db.patch(matchPlayerId, { onField: true,
      lastSubbedInAt: running ? startTime : undefined,
      officialEnteredElapsedMs: running ? playingElapsedMs(clock, startTime) : undefined });
    return;
  }
  await ctx.db.patch(matchPlayerId, {
    onField: true,
    lastSubbedInAt: startTime,
  });
}
