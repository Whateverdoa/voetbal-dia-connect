/**
 * Pure aggregation of season playing minutes from finished-match rows.
 */

export type SeasonMinutePlayer = {
  playerId: string;
  name: string;
  number: number | null;
  active: boolean;
};

export type SeasonMinuteMatchRow = {
  playerId: string;
  minutesPlayed: number;
};

export type SeasonMinuteTotal = {
  playerId: string;
  name: string;
  number: number | null;
  matchesPlayed: number;
  totalMinutes: number;
};

/** Sum minutes and match appearances per active player; least minutes first. */
export function aggregateSeasonPlayingTime(
  players: SeasonMinutePlayer[],
  rows: SeasonMinuteMatchRow[]
): SeasonMinuteTotal[] {
  const byPlayer = new Map<
    string,
    { matchesPlayed: number; totalMinutes: number }
  >();

  for (const row of rows) {
    const current = byPlayer.get(row.playerId) ?? {
      matchesPlayed: 0,
      totalMinutes: 0,
    };
    current.matchesPlayed += 1;
    current.totalMinutes += row.minutesPlayed;
    byPlayer.set(row.playerId, current);
  }

  return players
    .filter((player) => player.active)
    .map((player) => {
      const stats = byPlayer.get(player.playerId);
      return {
        playerId: player.playerId,
        name: player.name,
        number: player.number,
        matchesPlayed: stats?.matchesPlayed ?? 0,
        totalMinutes: Math.round(stats?.totalMinutes ?? 0),
      };
    })
    .sort(
      (a, b) =>
        a.totalMinutes - b.totalMinutes ||
        (a.number ?? 99) - (b.number ?? 99) ||
        a.name.localeCompare(b.name, "nl")
    );
}
