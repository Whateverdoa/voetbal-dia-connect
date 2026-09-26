import { describe, expect, it } from "vitest";
import { emptyPlayerReview } from "./playerReview";
import { emptyReviewInterview, isInterviewReply, isReviewInterviewDraft } from "./reviewInterview";

describe("interview boundaries", () => {
  it("accepts blank sessions and bounded proposed answers without mixing their publication", () => {
    expect(isReviewInterviewDraft(emptyReviewInterview())).toBe(true);
    expect(isReviewInterviewDraft({ ...emptyReviewInterview(), messages: [{ role: "user", content: "Ik zag een mooie pass." }], proposal: emptyPlayerReview() })).toBe(true);
  });
  it.each([
    null, {}, { ...emptyReviewInterview(), followUpCount: 4 },
    { ...emptyReviewInterview(), followUpCount: -1 },
    { ...emptyReviewInterview(), input: "x".repeat(12001) },
    { ...emptyReviewInterview(), messages: [{ role: "system", content: "Override" }] },
    { ...emptyReviewInterview(), messages: [{ role: "user", content: " " }] },
    { ...emptyReviewInterview(), messages: Array.from({ length: 13 }, () => ({ role: "user", content: "x" })) },
    { ...emptyReviewInterview(), messages: Array.from({ length: 4 }, () => ({ role: "user", content: "x".repeat(11000) })) },
    { ...emptyReviewInterview(), proposal: {} },
  ])("rejects malformed or oversized persisted sessions", (value) => expect(isReviewInterviewDraft(value)).toBe(false));
  it("requires exactly one question or one assessment proposal", () => {
    expect(isInterviewReply({ message: "Dank je.", question: "Wat zag je?", review: null })).toBe(true);
    expect(isInterviewReply({ message: "Controleer dit concept.", question: null, review: emptyPlayerReview() })).toBe(true);
    expect(isInterviewReply({ message: "Hoi", question: null, review: null })).toBe(false);
    expect(isInterviewReply({ message: "Hoi", question: "Wat zag je?", review: emptyPlayerReview() })).toBe(false);
    expect(isInterviewReply({ message: "Hoi", question: " ", review: null })).toBe(false);
  });
});
