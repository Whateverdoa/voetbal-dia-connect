/** Demo-only domain. String IDs deliberately do not depend on a backend. */
import type { ObservationCommand, StaffObservation } from "./observationTypes";
import type { PlayerReview } from "./playerReview";
export const SKILLS = ["balvaardigheid", "spelinzicht", "samenspel", "inzet", "sportiviteit"] as const;
export type Skill = (typeof SKILLS)[number];
export const SKILL_LEVELS = ["Nog niet beoordeeld", "In ontwikkeling", "Steeds vaker zichtbaar", "Sterk punt"] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];
export const CATEGORIES = ["Mooie pass", "Redding", "Verdedigen", "Doorzetten", "Sportiviteit", "Doelpunt"] as const;
export type HighlightCategory = (typeof CATEGORIES)[number];
export const VOTE_REASONS = ["Goed samengespeeld", "Bleef doorgaan", "Hielp het team", "Sterk verdedigd", "Sportief gespeeld", "Mooie acties"] as const;
export type VoteReason = (typeof VOTE_REASONS)[number];

export type DemoActor = { role: "coach" } | { role: "scout" } | { role: "player"; playerId: string } | { role: "parent"; guardianId: string };
export interface DemoPlayer {
  id: string;
  name: string;
  number: number | null;
  position: string;
  qualities: string[];
  motto: string;
}
export interface DemoGuardian { id: string; name: string; childrenIds: string[] }
export interface DemoMatch {
  id: string;
  opponent: string;
  dateLabel: string;
  score: string;
  phase: "preparing" | "voting" | "closed";
  participantIds: string[];
  openedAt?: number;
  closesAt?: number;
  playerCandidateIds?: string[];
  highlightCandidateIds?: string[];
}
export interface FeedbackContent {
  compliment: string;
  nextStep: string;
  skills: Record<Skill, SkillLevel>;
}
export interface CoachFeedback {
  id: string;
  playerId: string;
  kind: "match" | "periodic";
  matchId?: string;
  draft: FeedbackContent;
  published: FeedbackContent | null;
  publishedAt?: number;
  updatedAt: number;
}
export interface DemoPlayerReview {
  id: string;
  matchId: string;
  playerId: string;
  draft: PlayerReview;
  published: PlayerReview | null;
  publishedAt?: number;
  updatedAt: number;
}
export interface MatchHighlight {
  id: string;
  matchId: string;
  playerId: string;
  category: HighlightCategory;
  description: string;
  minute?: number;
  status: "pending" | "approved" | "rejected";
  submittedBy: string;
}
export interface DemoVote {
  matchId: string;
  voterId: string;
  kind: "player" | "highlight";
  targetId: string;
  reason?: VoteReason;
}
export interface DemoState {
  version: 1;
  players: DemoPlayer[];
  guardians: DemoGuardian[];
  matches: DemoMatch[];
  feedback: CoachFeedback[];
  /** Optional so existing v1 demo data keeps its feedback, votes and observations. */
  playerReviews?: DemoPlayerReview[];
  highlights: MatchHighlight[];
  votes: DemoVote[];
  /** Optional for existing v1 browser data; disabled until the coach enables it. */
  observationsEnabled?: boolean;
  observations?: StaffObservation[];
}
export type DemoCommand =
  | ObservationCommand
  | { type: "savePlayerReview"; matchId: string; playerId: string; answers: PlayerReview }
  | { type: "publishPlayerReview"; reviewId: string }
  | { type: "saveFeedback"; playerId: string; kind: CoachFeedback["kind"]; matchId?: string; content: FeedbackContent }
  | { type: "publishFeedback"; feedbackId: string }
  | { type: "addHighlight"; matchId: string; playerId: string; category: HighlightCategory; description: string; minute?: number }
  | { type: "reviewHighlight"; highlightId: string; approved: boolean }
  | { type: "openVoting"; matchId: string }
  | { type: "closeVoting"; matchId: string }
  | { type: "castVote"; matchId: string; kind: DemoVote["kind"]; targetId: string; reason?: VoteReason };

export type CommandHandler = (command: DemoCommand) => boolean;
export const emptyFeedback = (): FeedbackContent => ({
  compliment: "", nextStep: "",
  skills: { balvaardigheid: "Nog niet beoordeeld", spelinzicht: "Nog niet beoordeeld", samenspel: "Nog niet beoordeeld", inzet: "Nog niet beoordeeld", sportiviteit: "Nog niet beoordeeld" },
});
