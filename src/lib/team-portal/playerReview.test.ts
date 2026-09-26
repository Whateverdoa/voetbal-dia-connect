import { describe, expect, it } from "vitest";
import {
  buildPlayerReviewReport,
  emptyPlayerReview,
  getPlayerReviewProgress,
  isPlayerReview,
  MAX_PLAYER_REVIEW_ANSWER_LENGTH,
  PLAYER_REVIEW_QUESTIONS,
  type PlayerReview,
} from "./playerReview";

function completedCore(): PlayerReview {
  return {
    ...emptyPlayerReview(),
    positiveMoment: { text: "Je onderschepte een pass en hield daarna de bal bij ons.", notObserved: false },
    teamwork: { text: "Je waarschuwde een teamgenoot voor een tegenstander in zijn rug.", notObserved: false },
    nextStep: { text: "Oefen om voor je aanname over je schouder te kijken.", notObserved: false },
  };
}

describe("player review readiness", () => {
  it("starts with three unanswered core questions and two optional questions", () => {
    const review = emptyPlayerReview();
    expect(PLAYER_REVIEW_QUESTIONS.filter((question) => question.required)).toHaveLength(3);
    expect(PLAYER_REVIEW_QUESTIONS.filter((question) => !question.required)).toHaveLength(2);
    expect(getPlayerReviewProgress(review)).toEqual({
      status: "empty", coreAnswered: 0, coreTotal: 3, observedCount: 0,
      unansweredCoreIds: ["positiveMoment", "teamwork", "nextStep"], errors: {},
    });
    expect(buildPlayerReviewReport(review)).toBeNull();
  });

  it("creates independent answer objects for each question and each player", () => {
    const first = emptyPlayerReview();
    const second = emptyPlayerReview();
    first.positiveMoment.text = "Eén concreet moment.";
    expect(first.teamwork.text).toBe("");
    expect(second.positiveMoment.text).toBe("");
  });

  it("does not count whitespace as an observation", () => {
    const review = emptyPlayerReview();
    review.positiveMoment.text = "  \n\t ";
    expect(getPlayerReviewProgress(review).status).toBe("empty");
    expect(buildPlayerReviewReport(review)).toBeNull();
  });

  it("keeps a partially answered review as a draft", () => {
    const review = completedCore();
    review.nextStep.text = "";
    expect(getPlayerReviewProgress(review)).toMatchObject({ status: "draft", coreAnswered: 2, observedCount: 2, unansweredCoreIds: ["nextStep"] });
    expect(buildPlayerReviewReport(review)).toBeNull();
  });

  it("allows a report with three core answers without requiring the optional questions", () => {
    expect(getPlayerReviewProgress(completedCore())).toMatchObject({ status: "ready", coreAnswered: 3, observedCount: 3, errors: {} });
    expect(buildPlayerReviewReport(completedCore())?.sections).toHaveLength(3);
  });

  it("accepts explicit insufficient observation for a core answer without adding a negative judgement", () => {
    const review = completedCore();
    review.teamwork = { text: "", notObserved: true };
    expect(getPlayerReviewProgress(review)).toMatchObject({ status: "ready", coreAnswered: 3, observedCount: 2 });
    const report = buildPlayerReviewReport(review)!;
    expect(report.sections.map((section) => section.questionId)).toEqual(["positiveMoment", "nextStep"]);
    expect(report.limitedObservation).toBe(true);
    expect(report.observationNote).toContain("geen negatieve beoordeling");
  });

  it("cannot generate praise or a report if every core answer is unobserved", () => {
    const review = emptyPlayerReview();
    review.positiveMoment.notObserved = true;
    review.teamwork.notObserved = true;
    review.nextStep.notObserved = true;
    expect(getPlayerReviewProgress(review)).toMatchObject({ status: "draft", coreAnswered: 3, observedCount: 0, unansweredCoreIds: [] });
    expect(buildPlayerReviewReport(review)).toBeNull();
    review.onBall.text = "Je nam een hoge bal aan en speelde hem terug naar de keeper.";
    expect(getPlayerReviewProgress(review).status).toBe("ready");
    expect(buildPlayerReviewReport(review)?.sections).toEqual([
      { questionId: "onBall", heading: "Met de bal", text: review.onBall.text },
    ]);
  });

  it.each(["positiveMoment", "onBall"] as const)("blocks an overlong %s answer without truncating it silently", (questionId) => {
    const review = completedCore();
    review[questionId].text = "a".repeat(MAX_PLAYER_REVIEW_ANSWER_LENGTH + 1);
    expect(getPlayerReviewProgress(review)).toMatchObject({ status: "draft", errors: { [questionId]: "Gebruik maximaal 800 tekens." } });
    expect(buildPlayerReviewReport(review)).toBeNull();
    expect(review[questionId].text).toHaveLength(801);
    review[questionId].text = "a".repeat(MAX_PLAYER_REVIEW_ANSWER_LENGTH);
    expect(getPlayerReviewProgress(review).status).toBe("ready");
  });
});

describe("player-facing report", () => {
  it("copies only the supplied observations, trims edges and preserves the coach's words", () => {
    const review = completedCore();
    review.positiveMoment.text = "  Je onderschepte de pass.\nDaarna speelde je naar de vrije speler.  ";
    review.onBall.text = "Je nam de bal met je linkervoet mee naar de vrije ruimte.";
    review.offBall.text = "Je liep weg bij je tegenstander om aanspeelbaar te worden.";
    const before = structuredClone(review);
    const report = buildPlayerReviewReport(review)!;
    expect(report.sections.map((section) => section.text)).toEqual([
      review.positiveMoment.text.trim(), review.teamwork.text, review.onBall.text,
      review.offBall.text, review.nextStep.text,
    ]);
    expect(report.sections.map((section) => section.questionId)).toEqual(["positiveMoment", "teamwork", "onBall", "offBall", "nextStep"]);
    expect(report).toMatchObject({ limitedObservation: false, observationNote: null });
    expect(review).toEqual(before);
  });

  it("excludes retained draft text from answers marked not observed", () => {
    const review = completedCore();
    review.onBall = { text: "Dit moment herinner ik me toch niet zeker.", notObserved: true };
    const report = buildPlayerReviewReport(review)!;
    expect(report.sections).toHaveLength(3);
    expect(report.sections.some((section) => section.text.includes("toch niet zeker"))).toBe(false);
    expect(report.limitedObservation).toBe(true);
  });

  it("does not invent match events, grades, XP or awards from sparse answers", () => {
    const review = emptyPlayerReview();
    review.positiveMoment.text = "Je hielp een teamgenoot overeind.";
    review.teamwork.notObserved = true;
    review.nextStep.notObserved = true;
    const report = buildPlayerReviewReport(review)!;
    expect(report.sections).toEqual([{ questionId: "positiveMoment", heading: "Jouw mooie moment", text: "Je hielp een teamgenoot overeind." }]);
    expect(Object.keys(report).sort()).toEqual(["limitedObservation", "observationNote", "sections"]);
  });
});

describe("persisted player review validation", () => {
  it("accepts valid empty, completed and explicitly unobserved drafts", () => {
    expect(isPlayerReview(emptyPlayerReview())).toBe(true);
    expect(isPlayerReview(completedCore())).toBe(true);
    expect(isPlayerReview({ ...emptyPlayerReview(), offBall: { text: "", notObserved: true } })).toBe(true);
  });

  it.each([null, undefined, [], "review", 4, {}, { positiveMoment: { text: "Moment", notObserved: false } }])("rejects missing or malformed review data: %j", (value) => {
    expect(isPlayerReview(value)).toBe(false);
  });

  it.each([null, "antwoord", [], { text: 3, notObserved: false }, { text: "", notObserved: "yes" }, { text: "" }, { text: "a".repeat(801), notObserved: false }])("rejects malformed or oversized answers: %j", (answer) => {
    expect(isPlayerReview({ ...emptyPlayerReview(), teamwork: answer })).toBe(false);
  });
});
