// Shared types for live match components

export interface MatchData {
  id: string;
  opponent: string;
  isHome: boolean;
  status: "scheduled" | "lineup" | "live" | "halftime" | "finished";
  currentQuarter: number;
  quarterCount: number;
  regulationDurationMinutes?: number;
  homeScore: number;
  awayScore: number;
  showLineup: boolean;
  startedAt?: number;
  quarterStartedAt?: number;
  pausedAt?: number;
  accumulatedPauseTime?: number;
  teamName: string;
  teamSlug: string;
  clubName: string;
  teamLogoUrl?: string | null;
  clubLogoUrl?: string | null;
  opponentLogoUrl?: string | null;
  events: MatchEvent[];
  lineup: (LineupPlayer | null)[] | null;
}

export interface MatchEvent {
  _id?: string;
  type: string;
  playerName?: string;
  relatedPlayerName?: string;
  stagedEventId?: string;
  targetEventId?: string;
  quarter: number;
  matchMs?: number;
  isOwnGoal?: boolean;
  isOpponentGoal?: boolean;
  note?: string;
  timestamp: number;
  gameSecond?: number;
  displayMinute?: number;
  displayExtraMinute?: number;
}

export interface LineupPlayer {
  id: string;
  name: string;
  number?: number;
  onField: boolean;
  isKeeper: boolean;
}
