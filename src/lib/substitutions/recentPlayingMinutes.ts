export interface RecentPlayingMinutesGame {
  readonly date: string;
  readonly opponent: string;
}

export interface RecentPlayingMinutesPlayer {
  readonly name: string;
  readonly number: number;
  readonly minutes: readonly [number | null, number | null, number | null];
  readonly totalMinutes: number | null;
  /** Describes the current demo, not the player's role in previous matches. */
  readonly currentDemoKeeper?: boolean;
}

export interface RecentPlayingMinutesSnapshot {
  readonly team: string;
  readonly fetchedAt: string;
  readonly historyUrl: string;
  readonly games: readonly [RecentPlayingMinutesGame, RecentPlayingMinutesGame, RecentPlayingMinutesGame];
  readonly players: readonly RecentPlayingMinutesPlayer[];
}

// Read-only snapshot of teams:getMatchHistory, retained in
// outputs/wisselmodule-01a0e17c/recente-speelminuten.json. These figures have not
// been verified by a coach; missing source values must never become advice.
export const RECENT_PLAYING_MINUTES: RecentPlayingMinutesSnapshot = {
  team: "JO13-2",
  fetchedAt: "2026-09-30T14:20:48.922Z",
  historyUrl: "https://voetbal-dia-connect.vercel.app/team/jo13-2/history",
  games: [
    { date: "2026-09-26", opponent: "TSV Gudok O13-2" },
    { date: "2026-09-19", opponent: "Dongen O13-2" },
    { date: "2026-09-12", opponent: "VOAB O13-2" },
  ],
  players: [
    { name: "Tygo", number: 11, minutes: [54, 53.6, 38.6], totalMinutes: 146.2 },
    { name: "Lucas", number: 7, minutes: [47.8, 39.1, 46.1], totalMinutes: 133 },
    { name: "Revi", number: 5, minutes: [55, 53.7, 43.3], totalMinutes: 152 },
    { name: "Loek", number: 17, minutes: [60.2, 48.9, 27.2], totalMinutes: 136.3 },
    { name: "Sem", number: 15, minutes: [47.5, 55.1, 41.5], totalMinutes: 144.1 },
    { name: "Miloud", number: 8, minutes: [70.8, 50.3, 39.6], totalMinutes: 160.7 },
    { name: "Jody", number: 2, minutes: [49.4, 54.1, 50], totalMinutes: 153.5 },
    { name: "Max", number: 18, minutes: [49.6, 42.8, 44.4], totalMinutes: 136.8 },
    { name: "Matteo", number: 3, minutes: [55.1, 52.9, 40.1], totalMinutes: 148.1 },
    { name: "Olivier", number: 9, minutes: [34.6, 52.4, 44.2], totalMinutes: 131.2 },
    { name: "Luc", number: 1, minutes: [70.8, 64.2, 50.2], totalMinutes: 185.2, currentDemoKeeper: true },
    { name: "Macéo", number: 16, minutes: [49.5, 56.3, 31.8], totalMinutes: 137.6 },
    { name: "Krijn", number: 10, minutes: [59.4, 46.1, 36.3], totalMinutes: 141.8 },
    { name: "Lukas", number: 14, minutes: [70.8, 36.3, 11.4], totalMinutes: 118.5 },
  ],
};
