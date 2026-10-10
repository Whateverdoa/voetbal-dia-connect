/** True when a scheduled match lineup belongs to a different team than the match. */
export function rosterNeedsReplace(
  matchTeamId: string,
  playerTeamIds: Array<string | undefined>,
): boolean {
  if (playerTeamIds.length === 0) return false;
  return playerTeamIds.some((teamId) => teamId !== matchTeamId);
}
