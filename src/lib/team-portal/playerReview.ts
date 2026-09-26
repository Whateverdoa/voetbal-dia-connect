export const MAX_PLAYER_REVIEW_ANSWER_LENGTH = 800;

export type PlayerReviewQuestionId =
  | "positiveMoment"
  | "teamwork"
  | "nextStep"
  | "onBall"
  | "offBall";

export type PlayerReviewAnswer = {
  text: string;
  notObserved: boolean;
};

export type PlayerReview = Record<PlayerReviewQuestionId, PlayerReviewAnswer>;

export type PlayerReviewQuestion = {
  id: PlayerReviewQuestionId;
  label: string;
  hint: string;
  reportHeading: string;
  required: boolean;
};

export const PLAYER_REVIEW_QUESTIONS = [
  {
    id: "positiveMoment",
    label: "Welke concrete actie van deze speler ging goed?",
    hint: "Noem één moment dat je zelf zag en wat het opleverde. Schrijf voor de speler: 'Je liep na balverlies mee terug en won de bal.'",
    reportHeading: "Jouw mooie moment",
    required: true,
  },
  {
    id: "teamwork",
    label: "Hoe hielp deze speler het team?",
    hint: "Beschrijf een zichtbaar moment van samenspelen, communiceren, een goede keuze of doorzetten. Schrijf in de jij-vorm.",
    reportHeading: "Jouw bijdrage aan het team",
    required: true,
  },
  {
    id: "nextStep",
    label: "Wat is één haalbare volgende stap op de training?",
    hint: "Koppel een kleine oefenstap aan wat je zag. Bijvoorbeeld: 'Oefen om vóór je aanname één keer over je schouder te kijken.'",
    reportHeading: "Jouw volgende stap",
    required: true,
  },
  {
    id: "onBall",
    label: "Wat viel je op aan een actie met de bal?",
    hint: "Denk aan aannemen, passen, dribbelen, schieten of een redding. Beschrijf de situatie en de actie; een doelpuntentotaal zegt dit niet vanzelf.",
    reportHeading: "Met de bal",
    required: false,
  },
  {
    id: "offBall",
    label: "Wat viel je op aan een actie zonder bal?",
    hint: "Denk aan vrijlopen, rugdekking, druk zetten of omschakelen. Beschrijf één moment dat je zelf zag.",
    reportHeading: "Zonder bal",
    required: false,
  },
] as const satisfies readonly PlayerReviewQuestion[];

export type PlayerReviewProgress = {
  status: "empty" | "draft" | "ready";
  coreAnswered: number;
  coreTotal: 3;
  observedCount: number;
  unansweredCoreIds: PlayerReviewQuestionId[];
  errors: Partial<Record<PlayerReviewQuestionId, string>>;
};

export type PlayerReviewReport = {
  sections: {
    questionId: PlayerReviewQuestionId;
    heading: string;
    text: string;
  }[];
  limitedObservation: boolean;
  observationNote: string | null;
};

export function emptyPlayerReview(): PlayerReview {
  return {
    positiveMoment: { text: "", notObserved: false },
    teamwork: { text: "", notObserved: false },
    nextStep: { text: "", notObserved: false },
    onBall: { text: "", notObserved: false },
    offBall: { text: "", notObserved: false },
  };
}

/** Validate persisted or otherwise untrusted answers at the storage boundary. */
export function isPlayerReview(value: unknown): value is PlayerReview {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  return PLAYER_REVIEW_QUESTIONS.every(({ id }) => {
    const answer = (value as Record<string, unknown>)[id];
    if (answer === null || typeof answer !== "object" || Array.isArray(answer)) return false;
    const fields = answer as Record<string, unknown>;
    return typeof fields.text === "string"
      && fields.text.length <= MAX_PLAYER_REVIEW_ANSWER_LENGTH
      && typeof fields.notObserved === "boolean";
  });
}

export function getPlayerReviewProgress(review: PlayerReview): PlayerReviewProgress {
  const errors: PlayerReviewProgress["errors"] = {};
  const unansweredCoreIds: PlayerReviewQuestionId[] = [];
  let observedCount = 0;
  let hasInput = false;

  for (const question of PLAYER_REVIEW_QUESTIONS) {
    const answer = review[question.id];
    const text = answer.text.trim();
    const observed = !answer.notObserved && text.length > 0;
    if (answer.text.length > MAX_PLAYER_REVIEW_ANSWER_LENGTH) {
      errors[question.id] = `Gebruik maximaal ${MAX_PLAYER_REVIEW_ANSWER_LENGTH} tekens.`;
    }
    if (observed) observedCount += 1;
    if (text || answer.notObserved) hasInput = true;
    if (question.required && !observed && !answer.notObserved) unansweredCoreIds.push(question.id);
  }

  const hasErrors = Object.keys(errors).length > 0;
  const ready = unansweredCoreIds.length === 0 && observedCount > 0 && !hasErrors;
  return {
    status: ready ? "ready" : hasInput || hasErrors ? "draft" : "empty",
    coreAnswered: 3 - unansweredCoreIds.length,
    coreTotal: 3,
    observedCount,
    unansweredCoreIds,
    errors,
  };
}

const REPORT_QUESTION_ORDER: readonly PlayerReviewQuestionId[] = [
  "positiveMoment", "teamwork", "onBall", "offBall", "nextStep",
];

/** Assemble only the coach's own words; match statistics never imply a judgement. */
export function buildPlayerReviewReport(review: PlayerReview): PlayerReviewReport | null {
  if (getPlayerReviewProgress(review).status !== "ready") return null;
  const sections: PlayerReviewReport["sections"] = [];
  for (const questionId of REPORT_QUESTION_ORDER) {
    const answer = review[questionId];
    if (answer.notObserved || !answer.text.trim()) continue;
    const question = PLAYER_REVIEW_QUESTIONS.find(({ id }) => id === questionId)!;
    sections.push({ questionId, heading: question.reportHeading, text: answer.text.trim() });
  }
  const limitedObservation = PLAYER_REVIEW_QUESTIONS.some(({ id }) => review[id].notObserved);
  return {
    sections,
    limitedObservation,
    observationNote: limitedObservation
      ? "Je coach heeft niet ieder onderdeel voldoende kunnen bekijken. Dit is geen negatieve beoordeling."
      : null,
  };
}
