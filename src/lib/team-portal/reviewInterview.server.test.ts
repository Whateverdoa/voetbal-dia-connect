import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyPlayerReview } from "./playerReview";
import { generateInterviewReply, type InterviewRequest } from "./reviewInterview.server";

const generate = vi.hoisted(() => vi.fn());
vi.mock("ai", () => ({ generateText: generate, Output: { object: vi.fn() } }));
vi.mock("@ai-sdk/anthropic", () => ({ anthropic: vi.fn(() => "test-model") }));
const request = (): InterviewRequest => ({ messages: [{ role: "user", content: "Ik zag een pass." }], currentAnswers: emptyPlayerReview(), followUpCount: 0, finish: false, playerName: "Test", position: "CM" });
beforeEach(() => vi.clearAllMocks());

describe("Claude assessment generation", () => {
  it("passes coach evidence and demands no invented observations", async () => {
    generate.mockResolvedValue({ output: { message: "Dank je.", question: "Welk oefenpunt zag je?", review: null } });
    const response = await generateInterviewReply(request(), new AbortController().signal);
    expect(response.question).toBe("Welk oefenpunt zag je?");
    const call = generate.mock.calls[0][0];
    expect(call.system).toContain("Verzin geen acties");
    expect(call.system).toContain("Je eigen eerdere formuleringen zijn geen nieuwe feiten");
    expect(JSON.parse(call.prompt).conversation).toEqual(request().messages);
    expect(call.maxRetries).toBe(0);
  });
  it("strips suppressed text and never claims a proposal has been stored or published", async () => {
    const review = emptyPlayerReview();
    review.positiveMoment.text = "  Je gaf een gerichte pass.  ";
    review.teamwork = { text: "Mag niet in voorstel", notObserved: true };
    generate.mockResolvedValue({ output: { message: "Ik heb dit opgeslagen en gedeeld.", question: null, review } });
    const response = await generateInterviewReply({ ...request(), finish: true }, new AbortController().signal);
    expect(response.review?.positiveMoment.text).toBe("Je gaf een gerichte pass.");
    expect(response.review?.teamwork).toEqual({ text: "", notObserved: true });
    expect(response.review?.nextStep.notObserved).toBe(true);
    expect(response.message).not.toMatch(/opgeslagen|gedeeld/);
    expect(response.message).toContain("voordat je het overneemt");
  });
  it("omits withheld draft text from model evidence without changing the coach's draft", async () => {
    const input = request();
    input.currentAnswers.positiveMoment.text = "Je gaf een gerichte pass.";
    input.currentAnswers.teamwork = { text: "WITHHELD_PRIVATE_NOTE", notObserved: true };
    generate.mockResolvedValue({ output: { message: "Dank je.", question: "Wat zag je daarna?", review: null } });
    await generateInterviewReply(input, new AbortController().signal);
    const prompt = JSON.parse(generate.mock.calls[0][0].prompt);
    expect(prompt.existingCoachDraft.positiveMoment).toEqual(input.currentAnswers.positiveMoment);
    expect(prompt.existingCoachDraft.teamwork).toEqual({ text: "", notObserved: true });
    expect(generate.mock.calls[0][0].prompt).not.toContain("WITHHELD_PRIVATE_NOTE");
    expect(input.currentAnswers.teamwork).toEqual({ text: "WITHHELD_PRIVATE_NOTE", notObserved: true });
  });
  it("replaces misleading persistence claims in follow-up messages with neutral copy", async () => {
    generate.mockResolvedValue({ output: { message: "Ik heb dit opgeslagen en gedeeld.", question: "Welk moment zag je?", review: null } });
    const response = await generateInterviewReply(request(), new AbortController().signal);
    expect(response.message).toBe("Ik heb nog een korte vervolgvraag.");
    expect(response.question).toBe("Welk moment zag je?");
    expect(response.review).toBeNull();
  });
  it.each([{ finish: true, followUpCount: 1 }, { finish: false, followUpCount: 3 }])("forces completion at the coach's request or after three questions", async (mode) => {
    generate.mockResolvedValue({ output: { message: "Nog een vraag.", question: "Meer?", review: null } });
    await expect(generateInterviewReply({ ...request(), ...mode }, new AbortController().signal)).rejects.toThrow("INVALID_INTERVIEW_OUTPUT");
    expect(JSON.parse(generate.mock.calls[0][0].prompt).instruction).toContain("Stel GEEN vervolgvraag");
  });
  it("rejects ambiguous output rather than silently adopting it", async () => {
    generate.mockResolvedValue({ output: { message: "Onvolledig", question: null, review: null } });
    await expect(generateInterviewReply(request(), new AbortController().signal)).rejects.toThrow("INVALID_INTERVIEW_OUTPUT");
  });
});
