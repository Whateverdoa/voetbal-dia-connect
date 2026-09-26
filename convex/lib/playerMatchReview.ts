import { v } from "convex/values";
import { PLAYER_REVIEW_QUESTIONS, type PlayerReview } from "../../src/lib/team-portal/playerReview";

const answerValidator = v.object({ text: v.string(), notObserved: v.boolean() });

export const playerReviewValidator = v.object({
  positiveMoment: answerValidator,
  teamwork: answerValidator,
  nextStep: answerValidator,
  onBall: answerValidator,
  offBall: answerValidator,
});

export const playerMatchReviewViewValidator = v.object({
  _id: v.id("playerMatchReviews"),
  matchId: v.id("matches"),
  teamId: v.id("teams"),
  playerId: v.id("players"),
  draft: playerReviewValidator,
  finalized: v.union(playerReviewValidator, v.null()),
  finalizedAt: v.union(v.number(), v.null()),
  updatedAt: v.number(),
  revision: v.number(),
});

/** Final reports contain only observations; suppressed draft text stays private. */
export function finalizePlayerReviewAnswers(review: PlayerReview): PlayerReview {
  return Object.fromEntries(PLAYER_REVIEW_QUESTIONS.map(({ id }) => [id, {
    text: review[id].notObserved ? "" : review[id].text.trim(),
    notObserved: review[id].notObserved,
  }])) as PlayerReview;
}
