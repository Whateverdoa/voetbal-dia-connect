// Shared types for live match components

export interface MatchData {
  id: string;
  opponent: string;
  isHome: boolean;
  status: "scheduled" | "lineup" | "live" | "halftime" | "finished";
  currentQuarter: number;
  quarterCount: number;
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
  events: MatchEvent[];
  lineup: (LineupPlayer | null)[] | null;
}

export interface MatchEvent {
  type: string;
  playerName?: string;
  relatedPlayerName?: string;
  quarter: number;
  isOwnGoal?: boolean;
  isOpponentGoal?: boolean;
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
