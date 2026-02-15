import { Id } from "@/convex/_generated/dataModel";

export type MatchStatus = "scheduled" | "lineup" | "live" | "halftime" | "finished";

export interface MatchPlayer {
  matchPlayerId: Id<"matchPlayers">;
  playerId: Id<"players">;
  name: string;
  number?: number;
  onField: boolean;
  isKeeper: boolean;
  minutesPlayed?: number;
}

export interface MatchEvent {
  _id: Id<"matchEvents">;
  type: "goal" | "assist" | "sub_in" | "sub_out" | "quarter_start" | "quarter_end" | "yellow_card" | "red_card";
  playerId?: Id<"players">;
  relatedPlayerId?: Id<"players">;
  playerName?: string;
  relatedPlayerName?: string;
  quarter: number;
  isOwnGoal?: boolean;
  isOpponentGoal?: boolean;
  timestamp: number;
}

export interface Match {
  _id: Id<"matches">;
  teamId: Id<"teams">;
  publicCode: string;
  coachPin?: string;
  opponent: string;
  isHome: boolean;
  status: MatchStatus;
  currentQuarter: number;
  quarterCount: number;
  homeScore: number;
  awayScore: number;
  showLineup: boolean;
  startedAt?: number;
  quarterStartedAt?: number;
  pausedAt?: number;
  accumulatedPauseTime?: number;
  refereeId?: Id<"referees">;
  refereeName?: string | null;
  leadCoachId?: Id<"coaches"> | null;
  leadCoachName?: string | null;
  hasLead?: boolean;
  finishedAt?: number;
  teamName: string;
  players: MatchPlayer[];
  events: MatchEvent[];
}
