import { isPlayerReview, type PlayerReview } from "./playerReview";

export const MAX_INTERVIEW_INPUT_LENGTH = 12000;
export const MAX_INTERVIEW_MESSAGES = 12;
export const MAX_INTERVIEW_TOTAL_LENGTH = 40000;
export const MAX_INTERVIEW_FOLLOW_UPS = 3;

export interface InterviewMessage { role: "user" | "assistant"; content: string }
export interface ReviewInterviewDraft {
  messages: InterviewMessage[];
  input: string;
  followUpCount: number;
  proposal: PlayerReview | null;
}
export interface InterviewReply { message: string; question: string | null; review: PlayerReview | null }

export function emptyReviewInterview(): ReviewInterviewDraft {
  return { messages: [], input: "", followUpCount: 0, proposal: null };
}

const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
export function isInterviewMessages(value: unknown): value is InterviewMessage[] {
  return Array.isArray(value) && value.length <= MAX_INTERVIEW_MESSAGES &&
    value.every((item: unknown) => record(item) && (item.role === "user" || item.role === "assistant") && typeof item.content === "string" && item.content.trim().length > 0 && item.content.length <= MAX_INTERVIEW_INPUT_LENGTH) &&
    value.reduce((sum: number, item: InterviewMessage) => sum + item.content.length, 0) <= MAX_INTERVIEW_TOTAL_LENGTH;
}

/** Validate local transcripts independently of published assessments. */
export function isReviewInterviewDraft(value: unknown): value is ReviewInterviewDraft {
  return record(value) && isInterviewMessages(value.messages) && typeof value.input === "string" && value.input.length <= MAX_INTERVIEW_INPUT_LENGTH &&
    typeof value.followUpCount === "number" && Number.isInteger(value.followUpCount) && value.followUpCount >= 0 && value.followUpCount <= MAX_INTERVIEW_FOLLOW_UPS &&
    (value.proposal === null || isPlayerReview(value.proposal));
}

export function isInterviewReply(value: unknown): value is InterviewReply {
  return record(value) && typeof value.message === "string" && value.message.length <= 1600 &&
    (value.question === null || (typeof value.question === "string" && value.question.trim().length > 0 && value.question.length <= 500)) &&
    (value.review === null || isPlayerReview(value.review)) &&
    (value.question === null ? value.review !== null : value.review === null);
}
