/** Kickoff time for season history; scheduled date beats finish timestamp. */
export function matchKickoffMs(match: {
  scheduledAt?: number;
  finishedAt?: number;
}): number {
  return match.scheduledAt ?? match.finishedAt ?? 0;
}

/** Oldest / first match of the season first. */
export function compareSeasonHistory(
  left: { scheduledAt?: number; finishedAt?: number },
  right: { scheduledAt?: number; finishedAt?: number },
): number {
  return matchKickoffMs(left) - matchKickoffMs(right);
}
