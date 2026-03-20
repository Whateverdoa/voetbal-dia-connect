import { Id } from "@/convex/_generated/dataModel";

export type MatchStatus = "scheduled" | "lineup" | "live" | "halftime" | "finished";

export interface MatchPlayer {
  matchPlayerId: Id<"matchPlayers">;
  playerId: Id<"players">;
  name: string;
  number?: number;
  onField: boolean;
  isKeeper: boolean;
  absent?: boolean; // In squad but not physically present (e.g. called in sick)
  minutesPlayed?: number;
  positionPrimary?: string;
  positionSecondary?: string;
  fieldSlotIndex?: number;
}

export interface MatchEvent {
  _id: Id<"matchEvents">;
  type:
    | "goal"
    | "assist"
    | "sub_in"
    | "sub_out"
    | "substitution_staged"
    | "substitution_executed"
    | "substitution_cancelled"
    | "goal_enrichment"
    | "quarter_start"
    | "quarter_end"
    | "yellow_card"
    | "red_card";
  playerId?: Id<"players">;
  relatedPlayerId?: Id<"players">;
  stagedEventId?: Id<"matchEvents">;
  targetEventId?: Id<"matchEvents">;
  playerName?: string;
  relatedPlayerName?: string;
  quarter: number;
  matchMs?: number;
  isOwnGoal?: boolean;
  isOpponentGoal?: boolean;
  note?: string;
  correlationId?: string;
  commandType?: string;
  timestamp: number;
  gameSecond?: number;
  displayMinute?: number;
  displayExtraMinute?: number;
}

export interface StagedSubstitution {
  stagedEventId: Id<"matchEvents">;
  outId?: Id<"players">;
  outName?: string;
  inId?: Id<"players">;
  inName?: string;
  quarter: number;
  matchMs?: number;
  createdAt: number;
}

export interface Match {
  _id: Id<"matches">;
  teamId: Id<"teams">;
  publicCode: string;
  opponent: string;
  isHome: boolean;
  scheduledAt?: number;
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
  isCurrentCoachLead?: boolean;
  canControlClock?: boolean;
  capabilities?: {
    canControlClock: boolean;
    canDoSubstitutions: boolean;
    canManageLineup: boolean;
    canManagePregameSettings: boolean;
    canAssignReferee: boolean;
    canEnrichGoals: boolean;
    canAddGoals: boolean;
  };
  finishedAt?: number;
  teamName: string;
  players: MatchPlayer[];
  events: MatchEvent[];
  stagedSubstitutions?: StagedSubstitution[];
  formationId?: string;
  pitchType?: "full" | "half";
}
