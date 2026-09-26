import { useState } from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyPlayerReview, type PlayerReview } from "@/lib/team-portal/playerReview";
import { emptyReviewInterview, type ReviewInterviewDraft } from "@/lib/team-portal/reviewInterview";
import { PlayerReviewChat, type PlayerReviewChatProps } from "./PlayerReviewChat";

const speech = vi.hoisted(() => ({
  supported: true,
  listening: false,
  interim: "",
  error: null as string | null,
  start: vi.fn(),
  stop: vi.fn(),
  receive: null as ((text: string) => void) | null,
}));
vi.mock("@/hooks/useReviewDictation", () => ({
  useReviewDictation: ({ onTranscript }: { onTranscript: (text: string) => void }) => {
    speech.receive = onTranscript;
    return speech;
  },
}));

const player = { id: "synthetic-player", name: "Milan Voorbeeld", position: "Middenveld" };
const story = "Milan keek over zijn schouder en speelde de bal naar de vrije vleugel.";
const questionReply = { message: "Je noemt een gerichte pass.", question: "Hoe hielp hij zijn team daarna?", review: null };
const fetchMock = vi.fn<typeof fetch>();

function completeReview(): PlayerReview {
  return {
    ...emptyPlayerReview(),
    positiveMoment: { text: "Je speelde een gerichte pass naar de vrije vleugel.", notObserved: false },
    teamwork: { text: "Je bood je opnieuw aan na je pass.", notObserved: false },
    nextStep: { text: "Oefen om voor je aanname over je schouder te kijken.", notObserved: false },
  };
}

function reply(result: unknown, ok = true) {
  return { ok, json: async () => result } as Response;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => { resolve = complete; });
  return { promise, resolve };
}

function Harness({ initialValue = emptyReviewInterview(), onChange = vi.fn(), ...props }: Omit<PlayerReviewChatProps, "value" | "onChange"> & { initialValue?: ReviewInterviewDraft; onChange?: (value: ReviewInterviewDraft) => void }) {
  const [value, setValue] = useState(initialValue);
  return <PlayerReviewChat {...props} value={value} onChange={(next) => { setValue(next); onChange(next); }} />;
}

function inputStory(text = story) {
  fireEvent.change(screen.getByRole("textbox"), { target: { value: text } });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  speech.supported = true;
  speech.listening = false;
  speech.interim = "";
  speech.error = null;
  speech.start.mockReset();
  speech.stop.mockReset();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("PlayerReviewChat", () => {
  it("shows phone keyboard dictation guidance without starting browser recording", async () => {
    const user = userEvent.setup();
    render(<Harness player={player} answers={emptyPlayerReview()} onApply={vi.fn()} />);
    const textbox = screen.getByRole("textbox", { name: "Jouw verhaal" });
    expect(screen.getByText("Op je telefoon: tik in het tekstvak en gebruik de microfoon van je toetsenbord. Verstuur daarna je tekst naar de assistent.")).toBeVisible();
    expect(textbox).toHaveAttribute("placeholder", "Vertel of typ wat je je herinnert van deze speler…");
    expect(textbox).toHaveAccessibleDescription(/microfoon van je toetsenbord/);
    await user.click(textbox);
    expect(textbox).toHaveFocus();
    expect(speech.start).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("invites a story, discloses Claude, and sends only on an explicit action", async () => {
    const user = userEvent.setup();
    const answers = completeReview();
    const onApply = vi.fn();
    fetchMock.mockResolvedValueOnce(reply(questionReply));
    render(<Harness player={player} answers={answers} onApply={onApply} />);
    expect(screen.getByText(/Claude \(Anthropic\)/)).toBeVisible();
    expect(screen.getByRole("button", { name: "Vertel aan de assistent" })).toBeDisabled();
    inputStory();
    expect(fetchMock).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Vertel aan de assistent" }));
    await screen.findByText(/Hoe hielp hij zijn team daarna/);
    const request = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
    expect(fetchMock.mock.calls[0][0]).toBe("/demo/teamportaal/api/interview");
    expect(request).toEqual({ messages: [{ role: "user", content: story }], currentAnswers: answers, followUpCount: 0, finish: false, playerName: "Milan", position: "Middenveld" });
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(screen.getByText(/1 van maximaal 3 vervolgvragen/)).toBeVisible();
    expect(onApply).not.toHaveBeenCalled();
    expect(within(screen.getByRole("log")).getByText(story)).toBeVisible();
  });

  it("stages a generated report and only applies it after explicit adoption", async () => {
    const user = userEvent.setup();
    const review = completeReview();
    const onApply = vi.fn();
    fetchMock.mockResolvedValueOnce(reply({ message: "Dit is je concept.", question: null, review }));
    render(<Harness player={player} answers={emptyPlayerReview()} onApply={onApply} />);
    inputStory();
    await user.click(screen.getByRole("button", { name: "Maak nu een concept" }));
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string).finish).toBe(true);
    await screen.findByRole("heading", { name: "Voorstel voor het spelersverslag" });
    expect(screen.getByText(review.positiveMoment.text)).toBeVisible();
    expect(onApply).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /bewaren|delen|vastleggen/i })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Neem over als concept" }));
    expect(onApply).toHaveBeenCalledExactlyOnceWith(review);
    expect(screen.getByRole("button", { name: "Neem over als concept" })).toBeDisabled();
    expect(within(screen.getByRole("log")).getByText(story)).toBeVisible();
  });

  it("retains input on failure and retries without duplicate user messages", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(reply({ error: "Claude is tijdelijk niet beschikbaar." }, false));
    fetchMock.mockResolvedValueOnce(reply(questionReply));
    render(<Harness player={player} answers={emptyPlayerReview()} onApply={vi.fn()} />);
    inputStory();
    await user.click(screen.getByRole("button", { name: "Vertel aan de assistent" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Claude is tijdelijk niet beschikbaar.");
    expect(screen.getByRole("textbox")).toHaveValue(story);
    expect(within(screen.getByRole("log")).queryByText(story)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Vertel aan de assistent" }));
    await screen.findByText(/Hoe hielp hij zijn team daarna/);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1]!.body).toBe(fetchMock.mock.calls[1][1]!.body);
    expect(within(screen.getByRole("log")).getAllByText(story)).toHaveLength(1);
  });

  it("keeps only one request in flight and signals the parent while busy", async () => {
    const response = deferred<Response>();
    fetchMock.mockReturnValueOnce(response.promise);
    const onBusyChange = vi.fn();
    render(<Harness player={player} answers={emptyPlayerReview()} onApply={vi.fn()} onBusyChange={onBusyChange} />);
    inputStory();
    fireEvent.click(screen.getByRole("button", { name: "Vertel aan de assistent" }));
    fireEvent.click(screen.getByRole("button", { name: "Vertel aan de assistent" }));
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Nieuw gesprek" })).toBeDisabled();
    expect(onBusyChange).toHaveBeenLastCalledWith(true);
    await act(async () => response.resolve(reply(questionReply)));
    expect(onBusyChange).toHaveBeenLastCalledWith(false);
    expect(screen.getByRole("textbox")).toBeEnabled();
  });

  it("aborts unmounted requests and never applies late replies", async () => {
    const response = deferred<Response>();
    fetchMock.mockReturnValueOnce(response.promise);
    const onChange = vi.fn();
    const onApply = vi.fn();
    const mounted = render(<PlayerReviewChat player={player} value={{ ...emptyReviewInterview(), input: story }} onChange={onChange} answers={emptyPlayerReview()} onApply={onApply} />);
    fireEvent.click(screen.getByRole("button", { name: "Vertel aan de assistent" }));
    const signal = fetchMock.mock.calls[0][1]!.signal!;
    mounted.unmount();
    expect(signal.aborted).toBe(true);
    await act(async () => response.resolve(reply(questionReply)));
    expect(onChange).not.toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
  });

  it("starts a clean request session for another player and discards the former response", async () => {
    const response = deferred<Response>();
    fetchMock.mockReturnValueOnce(response.promise);
    const onChange = vi.fn();
    const props = { onChange, answers: emptyPlayerReview(), onApply: vi.fn() };
    const mounted = render(<PlayerReviewChat {...props} player={player} value={{ ...emptyReviewInterview(), input: story }} />);
    fireEvent.click(screen.getByRole("button", { name: "Vertel aan de assistent" }));
    mounted.rerender(<PlayerReviewChat {...props} player={{ id: "another-player", name: "Robin" }} value={emptyReviewInterview()} />);
    expect(screen.getByRole("textbox")).toBeEnabled();
    await act(async () => response.resolve(reply(questionReply)));
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByText(/Hoe hielp hij zijn team daarna/)).not.toBeInTheDocument();
  });

  it("forces a concept after the third question and refuses an extra question", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(reply(questionReply));
    render(<Harness player={player} answers={emptyPlayerReview()} onApply={vi.fn()} initialValue={{ ...emptyReviewInterview(), messages: [{ role: "assistant", content: "Welke oefenstap kies je?" }], followUpCount: 3, input: story }} />);
    await user.click(screen.getByRole("button", { name: "Vertel aan de assistent" }));
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string).finish).toBe(true);
    expect(await screen.findByRole("alert")).toHaveTextContent("Het antwoord van de assistent kon niet worden verwerkt");
    expect(screen.getByRole("textbox")).toHaveValue(story);
    expect(screen.getByText(/3 van maximaal 3 vervolgvragen/)).toBeVisible();
  });

  it("allows saying that an observation was not seen", async () => {
    const user = userEvent.setup();
    const unknown = Object.fromEntries(Object.keys(emptyPlayerReview()).map((id) => [id, { text: "", notObserved: true }])) as PlayerReview;
    fetchMock.mockResolvedValueOnce(reply({ message: "Dat blijft onbekend.", question: null, review: unknown }));
    const onApply = vi.fn();
    render(<Harness player={player} answers={emptyPlayerReview()} onApply={onApply} initialValue={{ ...emptyReviewInterview(), messages: [{ role: "assistant", content: "Hoe hielp hij het team?" }], followUpCount: 1 }} />);
    await user.click(screen.getByRole("button", { name: "Niet goed gezien" }));
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string).messages.at(-1)).toEqual({ role: "user", content: "Dit heb ik niet goed kunnen zien." });
    expect(await screen.findByText(/Er zijn nog onvoldoende concrete observaties/)).toBeVisible();
    expect(onApply).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Neem over als concept" }));
    expect(onApply).toHaveBeenCalledWith(unknown);
  });

  it("adds dictated text to the editable story without contacting Claude", async () => {
    const user = userEvent.setup();
    render(<Harness player={player} answers={emptyPlayerReview()} onApply={vi.fn()} />);
    inputStory("Eerste moment.");
    await user.click(screen.getByRole("button", { name: "Dicteer je verhaal" }));
    expect(speech.start).toHaveBeenCalledOnce();
    act(() => speech.receive?.("Een tweede moment."));
    expect(screen.getByRole("textbox")).toHaveValue("Eerste moment. Een tweede moment.");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText(/kan je browser een spraakdienst gebruiken/)).toBeVisible();
  });

  it("blocks sending while dictating and makes the stop action available", async () => {
    const user = userEvent.setup();
    speech.listening = true;
    speech.interim = "Ik zag een goede";
    const onBusyChange = vi.fn();
    render(<Harness player={player} answers={emptyPlayerReview()} onApply={vi.fn()} onBusyChange={onBusyChange} initialValue={{ ...emptyReviewInterview(), input: story }} />);
    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Vertel aan de assistent" })).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Ik zag een goede");
    expect(onBusyChange).toHaveBeenLastCalledWith(true);
    await user.click(screen.getByRole("button", { name: "Stop dicteren" }));
    expect(speech.stop).toHaveBeenCalledOnce();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps consecutive dictated chunks that arrive before React renders", () => {
    render(<Harness player={player} answers={emptyPlayerReview()} onApply={vi.fn()} />);
    inputStory("Eerste moment.");
    act(() => {
      speech.receive?.("Tweede moment.");
      speech.receive?.("Derde moment.");
    });
    expect(screen.getByRole("textbox")).toHaveValue("Eerste moment. Tweede moment. Derde moment.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stops dictation at the text limit and tells the coach to check the final words", () => {
    render(<Harness player={player} answers={emptyPlayerReview()} onApply={vi.fn()} initialValue={{ ...emptyReviewInterview(), input: "a".repeat(11995) }} />);
    act(() => speech.receive?.("meer woorden"));
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toHaveLength(12000);
    expect(speech.stop).toHaveBeenCalledOnce();
    expect(screen.getByRole("alert")).toHaveTextContent("Dicteren is gestopt");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("offers a keyboard fallback when speech recognition is unavailable", () => {
    speech.supported = false;
    render(<Harness player={player} answers={emptyPlayerReview()} onApply={vi.fn()} />);
    expect(screen.getByText(/Je browser ondersteunt hier geen dicteren/)).toBeVisible();
    expect(screen.queryByRole("button", { name: "Dicteer je verhaal" })).not.toBeInTheDocument();
    expect(screen.getByRole("textbox")).toBeEnabled();
  });

  it("requires confirmation to clear the conversation, without changing the form", async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    const onApply = vi.fn();
    render(<Harness player={player} answers={completeReview()} onApply={onApply} initialValue={{ ...emptyReviewInterview(), input: story }} />);
    await user.click(screen.getByRole("button", { name: "Nieuw gesprek" }));
    expect(screen.getByRole("textbox")).toHaveValue(story);
    await user.click(screen.getByRole("button", { name: "Nieuw gesprek" }));
    expect(confirm).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("textbox")).toHaveValue("");
    expect(onApply).not.toHaveBeenCalled();
  });

  it("rejects malformed proposals and network errors without losing the coach's story", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValueOnce(reply({ message: "Concept", question: null, review: { positiveMoment: "Wrong shape" } }));
    fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<Harness player={player} answers={emptyPlayerReview()} onApply={vi.fn()} />);
    inputStory();
    await user.click(screen.getByRole("button", { name: "Maak nu een concept" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Het antwoord van de assistent kon niet worden verwerkt");
    expect(screen.getByRole("textbox")).toHaveValue(story);
    await user.click(screen.getByRole("button", { name: "Maak nu een concept" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("De assistent is nu niet bereikbaar"));
    expect(screen.getByRole("textbox")).toHaveValue(story);
  });

  it("preserves a long story and explains the transcript budget before sending", async () => {
    const user = userEvent.setup();
    const longMessages: ReviewInterviewDraft["messages"] = Array.from({ length: 4 }, (_, index) => ({ role: index % 2 ? "assistant" : "user", content: "a".repeat(9400) }));
    render(<Harness player={player} answers={emptyPlayerReview()} onApply={vi.fn()} initialValue={{ ...emptyReviewInterview(), messages: longMessages, input: "b".repeat(400) }} />);
    await user.click(screen.getByRole("button", { name: "Vertel aan de assistent" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Dit gesprek is te lang om verder te sturen");
    expect(screen.getByRole("textbox")).toHaveValue("b".repeat(400));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
