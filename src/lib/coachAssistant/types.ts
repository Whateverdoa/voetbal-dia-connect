import type { DemoPlan } from "../substitutions/demoPlan";

export interface AssistantPlayer {
  key: string;
  availability: "present" | "absent" | "injured" | "unknown";
  primaryPosition: string | null;
  secondaryPosition: string | null;
  /** A coach-locked assignment applies to the entire proposed match. */
  lockedSlotId?: number;
  maxMinutes?: number;
  minutesReason?: "coach_choice" | "team_agreement";
  minutesNote?: string;
}

export interface HistoryPlayer {
  name?: string;
  recordedPosition?: string | null;
  playerKey: string;
  attendance: "present" | "absent" | "unknown";
  minutes: number | null;
  keeperMinutes: number | null;
  /** Null means unknown; BENCH is an explicitly confirmed non-start. */
  startingPosition: string | null;
}

export interface AssistantHistoryMatch {
  source?: "dia_live";
  id: string;
  teamKey: string;
  date: string;
  opponent: string;
  playingDuration: number;
  confirmed: boolean;
  /** Only a kickoff snapshot or explicit retrospective coach confirmation is valid. */
  startingLineupConfirmed: boolean;
  players: HistoryPlayer[];
}

export interface AssistantInput {
  teamKey: string;
  targetDate: string;
  plan: DemoPlan;
  players: AssistantPlayer[];
  keeperKey: string;
  /** Exact coach-selected kickoff field; later substitutions remain automatic. */
  startingField?: DemoPlan["startingLineup"]["field"];
  keepKeeper?: boolean;
  secondKeeperKey?: string;
  intervalMinutes: number;
  includeSubstitutions: boolean;
  history: AssistantHistoryMatch[];
}

export interface PlayerEvidence {
  recordedMinutes?: number | null;
  recordedEligibleMinutes?: number | null;
  playerKey: string;
  fieldMinutes: number | null;
  eligibleFieldMinutes: number | null;
  confirmedGames: number;
  starts: number | null;
  sourceIds: string[];
  previousPositions: string[];
}

export interface AssistantProposal {
  historicalMinuteBasis?: "field" | "recorded" | null;
  plan: DemoPlan;
  warnings: string[];
  evidence: PlayerEvidence[];
  reasons: Array<{ playerKey: string; slotId: number; text: string }>;
  usesHistoricalMinutes: boolean;
  usesHistoricalStarts: boolean;
}

export type AssistantResult =
  | { ok: true; proposal: AssistantProposal }
  | { ok: false; errors: string[] };
