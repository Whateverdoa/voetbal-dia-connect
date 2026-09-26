import { getPlayerReviewProgress, isPlayerReview, PLAYER_REVIEW_QUESTIONS, type PlayerReview } from "./playerReview";
import type { DemoActor, DemoCommand, DemoPlayerReview, DemoState } from "./types";

type PlayerReviewCommand = Extract<DemoCommand, { type: "savePlayerReview" | "publishPlayerReview" }>;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isIdentifier = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 200 && value.trim() === value;
const isTimestamp = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value) && value >= 0;

/** Keep withheld notes only in the draft; they never enter the published snapshot. */
export function getPlayerReviewPublication(review: PlayerReview): PlayerReview {
  const snapshot = structuredClone(review);
  for (const { id } of PLAYER_REVIEW_QUESTIONS) {
    snapshot[id].text = snapshot[id].notObserved ? "" : snapshot[id].text.trim();
  }
  return snapshot;
}

/** Validate optional review records without invalidating older v1 demo snapshots. */
export function isDemoPlayerReview(value: unknown): value is DemoPlayerReview {
  if (!isRecord(value) || !isIdentifier(value.id) || !isIdentifier(value.matchId) || !isIdentifier(value.playerId)) return false;
  if (!isPlayerReview(value.draft) || !isTimestamp(value.updatedAt)) return false;
  if (value.published === null) return value.publishedAt === undefined;
  const published = value.published;
  return isPlayerReview(published) && getPlayerReviewProgress(published).status === "ready"
    && PLAYER_REVIEW_QUESTIONS.every(({ id }) => !published[id].notObserved || published[id].text === "")
    && isTimestamp(value.publishedAt) && value.publishedAt <= value.updatedAt;
}

function assertAllowed(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

/** Demo-only review persistence; real identities and publication need server checks. */
export function applyPlayerReviewCommand(state: DemoState, actor: DemoActor, command: PlayerReviewCommand, now: number): DemoState {
  assertAllowed(actor.role === "coach", "Alleen de coach kan een spelerverslag schrijven of publiceren.");
  assertAllowed(isTimestamp(now), "Het tijdstip kon niet worden vastgesteld. Probeer opnieuw.");
  const reviews = state.playerReviews ?? [];

  if (command.type === "publishPlayerReview") {
    const review = reviews.find((item) => item.id === command.reviewId);
    assertAllowed(review, "Bewaar eerst het spelerverslag als concept.");
    assertAllowed(state.players.some((player) => player.id === review.playerId)
      && state.matches.some((match) => match.id === review.matchId && match.participantIds.includes(review.playerId)), "Kies een speler die aan deze wedstrijd deelnam.");
    assertAllowed(isPlayerReview(review.draft) && getPlayerReviewProgress(review.draft).status === "ready", "Beantwoord de drie basisvragen of geef aan wat je niet hebt gezien. Beschrijf minstens één concrete waarneming.");
    return {
      ...state,
      playerReviews: reviews.map((item) => item.id === review.id
        ? { ...item, published: getPlayerReviewPublication(item.draft), publishedAt: now, updatedAt: now }
        : item),
    };
  }

  assertAllowed(state.players.some((player) => player.id === command.playerId), "Speler niet gevonden.");
  assertAllowed(state.matches.some((match) => match.id === command.matchId && match.participantIds.includes(command.playerId)), "Kies een speler die aan deze wedstrijd deelnam.");
  assertAllowed(isPlayerReview(command.answers), "Controleer de antwoorden en gebruik maximaal 800 tekens per antwoord.");
  const previous = reviews.find((item) => item.matchId === command.matchId && item.playerId === command.playerId);
  const review: DemoPlayerReview = {
    id: previous?.id ?? `player-review-${now}-${reviews.length}`,
    matchId: command.matchId,
    playerId: command.playerId,
    draft: structuredClone(command.answers),
    published: previous?.published ? structuredClone(previous.published) : null,
    ...(previous?.publishedAt !== undefined ? { publishedAt: previous.publishedAt } : {}),
    updatedAt: now,
  };
  return { ...state, playerReviews: [...reviews.filter((item) => item.id !== review.id), review] };
}
