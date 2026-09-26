import { CATEGORIES, SKILLS, SKILL_LEVELS, VOTE_REASONS, type DemoState } from "./types";
import { isStaffObservation } from "./observationRules";
import { isDemoPlayerReview } from "./playerReviewRules";

export const DEMO_STORAGE_KEY = "dia-teamportaal-demo-v1";
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const string = (value: unknown): value is string => typeof value === "string";
const number = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(string);
const optionalNumber = (value: unknown) => value === undefined || number(value);
const optionalStrings = (value: unknown) => value === undefined || strings(value);
const includes = (options: readonly string[], value: unknown) => string(value) && options.includes(value);
const rows = (value: unknown, check: (row: Record<string, unknown>) => boolean) => Array.isArray(value) && value.every((row: unknown) => record(row) && check(row));
function content(value: unknown) {
  if (!record(value) || !string(value.compliment) || !string(value.nextStep) || !record(value.skills)) return false;
  const skills = value.skills;
  return value.compliment.length <= 600 && value.nextStep.length <= 600 && SKILLS.every((skill) => includes(SKILL_LEVELS, skills[skill]));
}

/** Validate saved browser data before using it; older/broken fixtures safely reset. */
export function isDemoState(value: unknown): value is DemoState {
  if (!record(value) || value.version !== 1) return false;
  if (value.observationsEnabled !== undefined && typeof value.observationsEnabled !== "boolean") return false;
  if (value.observations !== undefined && (!Array.isArray(value.observations) || !value.observations.every(isStaffObservation))) return false;
  if (value.playerReviews !== undefined && (!Array.isArray(value.playerReviews) || !value.playerReviews.every(isDemoPlayerReview))) return false;
  if (!rows(value.players, (row) => string(row.id) && string(row.name) && number(row.number) && string(row.position) && strings(row.qualities) && string(row.motto))) return false;
  if (!rows(value.guardians, (row) => string(row.id) && string(row.name) && strings(row.childrenIds))) return false;
  if (!rows(value.matches, (row) => string(row.id) && string(row.opponent) && string(row.dateLabel) && string(row.score) && includes(["preparing", "voting", "closed"], row.phase) && strings(row.participantIds) && optionalNumber(row.openedAt) && optionalNumber(row.closesAt) && optionalStrings(row.playerCandidateIds) && optionalStrings(row.highlightCandidateIds) && (row.phase === "preparing" || (number(row.openedAt) && number(row.closesAt) && strings(row.playerCandidateIds) && strings(row.highlightCandidateIds))))) return false;
  if (!rows(value.feedback, (row) => string(row.id) && string(row.playerId) && includes(["match", "periodic"], row.kind) && (row.matchId === undefined || string(row.matchId)) && content(row.draft) && (row.published === null || content(row.published)) && optionalNumber(row.publishedAt) && number(row.updatedAt))) return false;
  if (!rows(value.highlights, (row) => string(row.id) && string(row.matchId) && string(row.playerId) && includes(CATEGORIES, row.category) && string(row.description) && row.description.length > 0 && row.description.length <= 240 && (row.minute === undefined || (number(row.minute) && Number.isInteger(row.minute) && row.minute >= 1 && row.minute <= 120)) && includes(["pending", "approved", "rejected"], row.status) && string(row.submittedBy))) return false;
  if (!rows(value.votes, (row) => string(row.matchId) && string(row.voterId) && includes(["player", "highlight"], row.kind) && string(row.targetId) && (row.kind === "highlight" || includes(VOTE_REASONS, row.reason)))) return false;

  const state = value as unknown as DemoState;
  const unique = (ids: string[]) => ids.every((id) => id.length > 0) && new Set(ids).size === ids.length;
  if (state.players.length === 0 || state.matches.length === 0 || state.guardians.length === 0) return false;
  if (![state.players, state.guardians, state.matches, state.feedback, state.highlights].every((items) => unique(items.map((item) => item.id)))) return false;
  const playerIds = state.players.map((player) => player.id);
  const playerReviews = state.playerReviews ?? [];
  if (!unique(playerReviews.map((item) => item.id)) || !unique(playerReviews.map((item) => `${item.matchId}:${item.playerId}`))) return false;
  if (!playerReviews.every((item) => playerIds.includes(item.playerId) && state.matches.some((match) => match.id === item.matchId && match.participantIds.includes(item.playerId)))) return false;
  if (!unique((state.observations ?? []).map((item) => item.id))) return false;
  if (!(state.observations ?? []).every((item) => playerIds.includes(item.playerId) && (item.content.context === "training" || state.matches.some((match) => match.id === item.content.matchId && match.participantIds.includes(item.playerId))))) return false;
  if (!state.guardians.every((guardian) => guardian.childrenIds.length > 0 && unique(guardian.childrenIds) && guardian.childrenIds.every((id) => playerIds.includes(id)))) return false;
  if (!state.matches.every((match) => unique(match.participantIds) && unique(match.playerCandidateIds ?? []) && unique(match.highlightCandidateIds ?? []) && match.participantIds.every((id) => playerIds.includes(id)) && (match.playerCandidateIds ?? []).every((id) => match.participantIds.includes(id)) && (match.highlightCandidateIds ?? []).every((id) => state.highlights.some((item) => item.id === id && item.matchId === match.id && item.status === "approved")))) return false;
  if (!state.highlights.every((highlight) => state.matches.some((match) => match.id === highlight.matchId && match.participantIds.includes(highlight.playerId)) && (highlight.submittedBy === "coach" || playerIds.includes(highlight.submittedBy)))) return false;
  if (!state.feedback.every((feedback) => playerIds.includes(feedback.playerId) && (feedback.kind === "periodic" ? feedback.matchId === undefined : state.matches.some((match) => match.id === feedback.matchId && match.participantIds.includes(feedback.playerId))))) return false;
  if (!unique(state.feedback.map((item) => `${item.playerId}:${item.kind}:${item.matchId ?? ""}`))) return false;
  if (!unique(state.votes.map((vote) => `${vote.matchId}:${vote.voterId}:${vote.kind}`))) return false;
  return state.votes.every((vote) => {
    const match = state.matches.find((item) => item.id === vote.matchId);
    if (!match || match.phase === "preparing" || !match.participantIds.includes(vote.voterId)) return false;
    return vote.kind === "player"
      ? Boolean(match.playerCandidateIds?.includes(vote.targetId) && vote.targetId !== vote.voterId)
      : Boolean(match.highlightCandidateIds?.includes(vote.targetId) && state.highlights.some((item) => item.id === vote.targetId && item.playerId !== vote.voterId));
  });
}

export function parseSavedDemo(raw: string | null): DemoState | null {
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isDemoState(parsed) ? parsed : null;
  } catch { return null; }
}
