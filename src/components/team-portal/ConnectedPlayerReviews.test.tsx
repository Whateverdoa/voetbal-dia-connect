import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { getFunctionName, type FunctionReference } from "convex/server";
import { ConvexError } from "convex/values";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";
import type { AfterMatchReport } from "@/lib/team-portal/matchReport";
import { emptyPlayerReview, PLAYER_REVIEW_QUESTIONS, type PlayerReview } from "@/lib/team-portal/playerReview";
import { ConnectedPlayerReviews } from "./ConnectedPlayerReviews";
import type { PlayerReviewChatProps } from "./PlayerReviewChat";

type SavedReview = {
  _id: Id<"playerMatchReviews">;
  matchId: Id<"matches">;
  teamId: Id<"teams">;
  playerId: Id<"players">;
  draft: PlayerReview;
  finalized: PlayerReview | null;
  finalizedAt: number | null;
  updatedAt: number;
  revision: number;
};
type SaveArgs = { matchId: Id<"matches">; playerId: Id<"players">; answers: PlayerReview; expectedRevision: number | null };
type FinalizeArgs = { matchId: Id<"matches">; playerId: Id<"players">; expectedRevision: number };

const mocks = vi.hoisted(() => ({
  query: vi.fn<(reference: unknown, args: unknown) => unknown>(),
  mutation: vi.fn<(reference: unknown) => unknown>(),
  save: vi.fn<(args: SaveArgs) => Promise<SavedReview>>(),
  finalize: vi.fn<(args: FinalizeArgs) => Promise<SavedReview>>(),
  dirty: vi.fn<(dirty: boolean) => void>(),
}));
vi.mock("convex/react", () => ({ useQuery: mocks.query, useMutation: mocks.mutation }));
vi.mock("@/convex/_generated/api", async () => ({ api: (await import("convex/server")).anyApi }));
vi.mock("./PlayerReviewChat", () => ({
  PlayerReviewChat: ({ player, value, onChange, onApply, onBusyChange }: PlayerReviewChatProps) => <div>
    <h3>Gesprek voor {player.name}</h3>
    <textarea aria-label="Gespreksinvoer" value={value.input} onChange={(event) => onChange({ ...value, input: event.target.value })} />
    <button type="button" onClick={() => onApply(completeAnswers())}>Pas chatvoorstel toe</button>
    <button type="button" onClick={() => onBusyChange?.(true)}>Start spreken</button>
    <button type="button" onClick={() => onBusyChange?.(false)}>Stop spreken</button>
  </div>,
}));

const MATCH_ID = "match-real" as Id<"matches">;
const PLAYER_ID = "player-milan" as Id<"players">;
const SECOND_PLAYER_ID = "player-noor" as Id<"players">;
const NOW = 1800000000000;
let records: SavedReview[] | undefined;
let queryFailure = false;

function referenceName(reference: unknown): string {
  return typeof reference === "string" ? reference : getFunctionName(reference as FunctionReference<"query" | "mutation">);
}

function completeAnswers(moment = "Je onderschepte de pass en hield de bal in het team."): PlayerReview {
  return {
    ...emptyPlayerReview(),
    positiveMoment: { text: moment, notObserved: false },
    teamwork: { text: "Je gaf een teamgenoot een vrije afspeelmogelijkheid.", notObserved: false },
    nextStep: { text: "Oefen om voor je aanname over je schouder te kijken.", notObserved: false },
  };
}

function savedReview(overrides: Partial<SavedReview> = {}): SavedReview {
  return {
    _id: "review-real" as Id<"playerMatchReviews">,
    matchId: MATCH_ID,
    teamId: "team-real" as Id<"teams">,
    playerId: PLAYER_ID,
    draft: completeAnswers(),
    finalized: null,
    finalizedAt: null,
    updatedAt: NOW,
    revision: 1,
    ...overrides,
  };
}

function matchReport(): AfterMatchReport {
  return {
    matchId: MATCH_ID, teamName: "DIA JO13-02", opponent: "Groenwit", homeTeam: "DIA JO13-02", awayTeam: "Groenwit", isHome: true,
    scheduledAt: NOW, score: { home: 1, away: 0, team: 1, opponent: 0, label: "1 – 0" }, summary: "Geregistreerde eindstand.",
    players: [
      { playerId: PLAYER_ID, name: "Milan", number: 8, minutesPlayed: 45, goals: 1, assists: 0, yellowCards: 0, redCards: 0 },
      { playerId: SECOND_PLAYER_ID, name: "Noor", number: 1, minutesPlayed: 60, goals: 0, assists: 0, yellowCards: 0, redCards: 0 },
    ],
    timeline: [
      { id: "goal", type: "goal", timeLabel: "12'", periodLabel: "Eerste helft", text: "Doelpunt Milan", detail: "Assist van teamgenoot", note: "Laag in de hoek", playerIds: [PLAYER_ID] },
      { id: "noor-moment", type: "substitution", timeLabel: "30'", periodLabel: "Eerste helft", text: "Noor in het veld", detail: null, note: null, playerIds: [SECOND_PLAYER_ID] },
      { id: "period", type: "period", timeLabel: "60'", periodLabel: "Tweede helft", text: "Wedstrijd afgelopen", detail: null, note: null, playerIds: [] },
    ],
    recorded: { teamGoals: 1, opponentGoals: 0, assists: 1, substitutions: 1, yellowCards: 0, redCards: 0 },
    completenessNotes: [],
  };
}

function questionInput(id: "positiveMoment" | "teamwork" | "nextStep") {
  return screen.getByRole("textbox", { name: PLAYER_REVIEW_QUESTIONS.find((question) => question.id === id)!.label });
}

function fillCore(content = completeAnswers()) {
  for (const id of ["positiveMoment", "teamwork", "nextStep"] as const) {
    fireEvent.change(questionInput(id), { target: { value: content[id].text } });
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  records = [];
  queryFailure = false;
  mocks.query.mockImplementation((reference) => {
    if (referenceName(reference) !== "playerMatchReviews:listForMatch") throw new Error("Unexpected query");
    if (queryFailure) throw new Error("Function not deployed");
    return records;
  });
  mocks.mutation.mockImplementation((reference) => {
    const name = referenceName(reference);
    if (name === "playerMatchReviews:saveDraft") return mocks.save;
    if (name === "playerMatchReviews:finalize") return mocks.finalize;
    throw new Error("Unexpected mutation");
  });
  mocks.save.mockImplementation(async (args) => savedReview({ playerId: args.playerId, draft: args.answers, revision: (args.expectedRevision ?? 0) + 1 }));
  mocks.finalize.mockImplementation(async (args) => savedReview({ playerId: args.playerId, draft: records?.[0]?.draft ?? completeAnswers(), finalized: records?.[0]?.draft ?? completeAnswers(), finalizedAt: NOW + 1, revision: args.expectedRevision + 1 }));
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("connected player report editor", () => {
  it("creates a real-match draft with null revision and keeps the acknowledged answer while the query catches up", async () => {
    render(<ConnectedPlayerReviews report={matchReport()} matchId={MATCH_ID} onDirtyChange={mocks.dirty} />);
    expect(mocks.query).toHaveBeenCalledWith(expect.anything(), { matchId: MATCH_ID });
    expect(mocks.dirty).toHaveBeenLastCalledWith(false);
    const content = completeAnswers("Je hield de bal binnen bij de zijlijn.");
    fillCore(content);
    expect(mocks.dirty).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: "Concept bewaren" }));
    await screen.findByText("Concept opgeslagen bij deze wedstrijd. Je kunt later verdergaan.");
    expect(mocks.save).toHaveBeenCalledExactlyOnceWith({ matchId: MATCH_ID, playerId: PLAYER_ID, answers: content, expectedRevision: null });
    expect(records).toEqual([]);
    expect(questionInput("positiveMoment")).toHaveValue(content.positiveMoment.text);
    expect(screen.getByRole("button", { name: "Concept bewaren" })).toBeDisabled();
    await waitFor(() => expect(mocks.dirty).toHaveBeenLastCalledWith(false));
    expect(mocks.finalize).not.toHaveBeenCalled();
  });

  it("loads saved answers and preserves the first-edit revision when another query version arrives", async () => {
    records = [savedReview({ revision: 4 })];
    const report = matchReport();
    const { rerender } = render(<ConnectedPlayerReviews report={report} matchId={MATCH_ID} onDirtyChange={mocks.dirty} />);
    expect(questionInput("positiveMoment")).toHaveValue(records[0].draft.positiveMoment.text);
    fireEvent.change(questionInput("positiveMoment"), { target: { value: "Mijn lokale herinnering." } });
    records = [savedReview({ revision: 5, draft: completeAnswers("De wijziging op het andere scherm.") })];
    rerender(<ConnectedPlayerReviews report={report} matchId={MATCH_ID} onDirtyChange={mocks.dirty} />);
    mocks.save.mockRejectedValueOnce(new ConvexError({ code: "CONFLICT", message: "Newer revision exists" }));
    fireEvent.click(screen.getByRole("button", { name: "Concept bewaren" }));
    await screen.findByText(/Dit concept is op een ander scherm gewijzigd/);
    expect(mocks.save).toHaveBeenLastCalledWith(expect.objectContaining({ expectedRevision: 4, answers: expect.objectContaining({ positiveMoment: { text: "Mijn lokale herinnering.", notObserved: false } }) }));
    expect(questionInput("positiveMoment")).toHaveValue("Mijn lokale herinnering.");
    expect(mocks.dirty).toHaveBeenLastCalledWith(true);
    vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    fireEvent.click(screen.getByRole("button", { name: "Opgeslagen versie laden" }));
    expect(questionInput("positiveMoment")).toHaveValue("Mijn lokale herinnering.");
    fireEvent.click(screen.getByRole("button", { name: "Opgeslagen versie laden" }));
    expect(questionInput("positiveMoment")).toHaveValue("De wijziging op het andere scherm.");
    expect(mocks.dirty).toHaveBeenLastCalledWith(false);
  });

  it("retains answers and the selected player when saving before next fails", async () => {
    render(<ConnectedPlayerReviews report={matchReport()} matchId={MATCH_ID} onDirtyChange={mocks.dirty} />);
    fillCore();
    mocks.save.mockRejectedValueOnce(new Error("Offline"));
    fireEvent.click(screen.getByRole("button", { name: "Bewaar en volgende speler" }));
    await screen.findByText(/Bewaren is niet gelukt/);
    expect(screen.getByRole("heading", { name: /Even terugkijken met Milan/ })).toBeInTheDocument();
    expect(questionInput("positiveMoment")).toHaveValue(completeAnswers().positiveMoment.text);
    expect(mocks.save).toHaveBeenCalledOnce();
    expect(mocks.dirty).toHaveBeenLastCalledWith(true);
  });

  it("saves once before moving to a fresh form for the next player", async () => {
    render(<ConnectedPlayerReviews report={matchReport()} matchId={MATCH_ID} onDirtyChange={mocks.dirty} />);
    fillCore();
    fireEvent.click(screen.getByRole("button", { name: "Bewaar en volgende speler" }));
    await screen.findByRole("heading", { name: /Even terugkijken met Noor/ });
    expect(mocks.save).toHaveBeenCalledOnce();
    expect(mocks.save).toHaveBeenLastCalledWith(expect.objectContaining({ playerId: PLAYER_ID, matchId: MATCH_ID, expectedRevision: null }));
    expect(questionInput("positiveMoment")).toHaveValue("");
    await waitFor(() => expect(mocks.dirty).toHaveBeenLastCalledWith(false));
  });

  it("finalizes only after saving, previewing and explicitly confirming the report", async () => {
    records = [savedReview({ revision: 7 })];
    render(<ConnectedPlayerReviews report={matchReport()} matchId={MATCH_ID} onDirtyChange={mocks.dirty} />);
    expect(screen.queryByRole("button", { name: "Verslag vastleggen" })).not.toBeInTheDocument();
    expect(mocks.finalize).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Bekijk conceptverslag" }));
    expect(screen.getByRole("button", { name: "Verslag vastleggen" })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: "Ik heb het verslag nagelezen." }));
    fireEvent.click(screen.getByRole("button", { name: "Verslag vastleggen" }));
    await screen.findByText("Spelerverslag vastgelegd. Het is opgeslagen bij deze wedstrijd in jouw coachaccount.");
    expect(mocks.finalize).toHaveBeenCalledExactlyOnceWith({ matchId: MATCH_ID, playerId: PLAYER_ID, expectedRevision: 7 });
    expect(screen.getByRole("heading", { name: "Vastgelegd spelersverslag" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verslag vastleggen" })).toBeDisabled();
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("keeps the previously finalized report visible after saving new draft answers", async () => {
    const prior = completeAnswers("De eerder vastgelegde observatie.");
    records = [savedReview({ draft: prior, finalized: prior, finalizedAt: NOW, revision: 3 })];
    render(<ConnectedPlayerReviews report={matchReport()} matchId={MATCH_ID} onDirtyChange={mocks.dirty} />);
    const newer = completeAnswers("Een nieuwe observatie, nog niet vastgelegd.");
    mocks.save.mockResolvedValueOnce(savedReview({ draft: newer, finalized: prior, finalizedAt: NOW, revision: 4 }));
    fillCore(newer);
    fireEvent.click(screen.getByRole("button", { name: "Concept bewaren" }));
    await screen.findByText("Concept opgeslagen bij deze wedstrijd. Je kunt later verdergaan.");
    const finalized = screen.getByRole("heading", { name: "Vastgelegd spelersverslag" }).closest("section")!;
    expect(within(finalized).getByText(prior.positiveMoment.text)).toBeInTheDocument();
    expect(within(finalized).queryByText(newer.positiveMoment.text)).not.toBeInTheDocument();
    expect(within(finalized).getByText(/nog niet in dit vastgelegde verslag opgenomen/)).toBeInTheDocument();
    expect(questionInput("positiveMoment")).toHaveValue(newer.positiveMoment.text);
    expect(mocks.finalize).not.toHaveBeenCalled();
  });

  it("requires changed answers to be saved before finalizing and uses the acknowledged revision", async () => {
    records = [savedReview({ revision: 2 })];
    render(<ConnectedPlayerReviews report={matchReport()} matchId={MATCH_ID} onDirtyChange={mocks.dirty} />);
    const updated = completeAnswers("Je hielp de bal terug te winnen bij de zijlijn.");
    fillCore(updated);
    fireEvent.click(screen.getByRole("button", { name: "Bekijk conceptverslag" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Ik heb het verslag nagelezen." }));
    expect(screen.getByRole("button", { name: "Verslag vastleggen" })).toBeDisabled();
    expect(mocks.finalize).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Concept bewaren" }));
    await screen.findByText("Concept opgeslagen bij deze wedstrijd. Je kunt later verdergaan.");
    expect(mocks.save).toHaveBeenLastCalledWith(expect.objectContaining({ expectedRevision: 2 }));
    mocks.finalize.mockResolvedValueOnce(savedReview({ draft: updated, finalized: updated, finalizedAt: NOW + 1, revision: 4 }));
    fireEvent.click(screen.getByRole("button", { name: "Verslag vastleggen" }));
    await screen.findByText("Spelerverslag vastgelegd. Het is opgeslagen bij deze wedstrijd in jouw coachaccount.");
    expect(mocks.finalize).toHaveBeenCalledExactlyOnceWith({ matchId: MATCH_ID, playerId: PLAYER_ID, expectedRevision: 3 });
  });

  it("disables fields, roster switching and next while a write is pending", async () => {
    let resolveSave: ((value: SavedReview) => void) | undefined;
    mocks.save.mockImplementation(() => new Promise((resolve) => { resolveSave = resolve; }));
    render(<ConnectedPlayerReviews report={matchReport()} matchId={MATCH_ID} onDirtyChange={mocks.dirty} />);
    fillCore();
    fireEvent.click(screen.getByRole("button", { name: "Concept bewaren" }));
    expect(questionInput("positiveMoment")).toBeDisabled();
    expect(screen.getByRole("button", { name: /Noor.*Nog te bespreken/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Bewaar en volgende speler" })).toBeDisabled();
    expect(screen.getByText("Opslaan…")).toBeInTheDocument();
    await act(async () => resolveSave!(savedReview()));
    expect(questionInput("positiveMoment")).toBeEnabled();
    expect(screen.getByRole("button", { name: /Noor.*Nog te bespreken/ })).toBeEnabled();
  });

  it("uses only the current player's recorded moments as reminders and never fills answers from statistics", () => {
    render(<ConnectedPlayerReviews report={matchReport()} matchId={MATCH_ID} onDirtyChange={mocks.dirty} />);
    const reminders = within(screen.getByRole("list", { name: "Geregistreerde momenten van Milan" }));
    expect(reminders.getByText("Doelpunt Milan · Assist van teamgenoot · Laag in de hoek")).toBeInTheDocument();
    expect(reminders.queryByText("Noor in het veld")).not.toBeInTheDocument();
    expect(reminders.queryByText("Wedstrijd afgelopen")).not.toBeInTheDocument();
    expect(screen.getByText("Geregistreerde speeltijd: 45 min")).toBeInTheDocument();
    expect(questionInput("positiveMoment")).toHaveValue("");
    expect(questionInput("teamwork")).toHaveValue("");
    expect(questionInput("nextStep")).toHaveValue("");
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("checks before discarding a dirty player's answers and clears parent dirty state on unmount", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    const { unmount } = render(<ConnectedPlayerReviews report={matchReport()} matchId={MATCH_ID} onDirtyChange={mocks.dirty} />);
    fireEvent.change(questionInput("positiveMoment"), { target: { value: "Niet bewaard." } });
    fireEvent.click(screen.getByRole("button", { name: /Noor.*Nog te bespreken/ }));
    expect(questionInput("positiveMoment")).toHaveValue("Niet bewaard.");
    expect(confirm).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: /Noor.*Nog te bespreken/ }));
    expect(screen.getByRole("heading", { name: /Even terugkijken met Noor/ })).toBeInTheDocument();
    expect(questionInput("positiveMoment")).toHaveValue("");
    fireEvent.change(questionInput("positiveMoment"), { target: { value: "Noors onbewaarde antwoord." } });
    expect(mocks.dirty).toHaveBeenLastCalledWith(true);
    unmount();
    expect(mocks.dirty).toHaveBeenLastCalledWith(false);
    expect(mocks.save).not.toHaveBeenCalled();
  });

  it("limits forms to eligible match participants, leaving an absent player out of the queue", () => {
    render(<ConnectedPlayerReviews report={matchReport()} matchId={MATCH_ID} participantIds={[SECOND_PLAYER_ID]} onDirtyChange={mocks.dirty} />);
    expect(screen.getByRole("heading", { name: /Even terugkijken met Noor/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Milan.*Nog te bespreken/ })).not.toBeInTheDocument();
    expect(screen.getByText("0 van 1 verslagen vastgelegd")).toBeInTheDocument();
  });

  it("shows loading and empty-roster states without inventing a player", () => {
    records = undefined;
    const { rerender } = render(<ConnectedPlayerReviews report={matchReport()} matchId={MATCH_ID} onDirtyChange={mocks.dirty} />);
    expect(screen.getByText("Je spelerformulieren laden…")).toBeInTheDocument();
    records = [];
    rerender(<ConnectedPlayerReviews report={matchReport()} matchId={MATCH_ID} participantIds={[]} onDirtyChange={mocks.dirty} />);
    expect(screen.getByText("Er zijn geen geregistreerde spelers waarvoor een formulier kan worden klaargezet.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("contains unavailable-service failures so the match report remains accessible and supports retry", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    queryFailure = true;
    render(<><ConnectedPlayerReviews report={matchReport()} matchId={MATCH_ID} onDirtyChange={mocks.dirty} /><article>De bestaande wedstrijdregistratie</article></>);
    expect(screen.getByRole("heading", { name: "Spelerformulieren niet beschikbaar" })).toBeInTheDocument();
    expect(screen.getByText("De bestaande wedstrijdregistratie")).toBeInTheDocument();
    queryFailure = false;
    fireEvent.click(screen.getByRole("button", { name: "Opnieuw proberen" }));
    await waitFor(() => expect(screen.getByRole("heading", { name: /Even terugkijken met Milan/ })).toBeInTheDocument());
  });

  it("keeps development conversations for each player and warns before leaving without writing transcripts anywhere", () => {
    vi.stubEnv("NODE_ENV", "development");
    const confirm = vi.spyOn(window, "confirm");
    const storage = vi.spyOn(Storage.prototype, "setItem");
    render(<ConnectedPlayerReviews report={matchReport()} matchId={MATCH_ID} onDirtyChange={mocks.dirty} />);
    expect(mocks.dirty).toHaveBeenLastCalledWith(false);
    fireEvent.change(screen.getByRole("textbox", { name: "Gespreksinvoer" }), { target: { value: "Mijn onbewerkte verhaal over Milan." } });
    expect(mocks.dirty).toHaveBeenLastCalledWith(true);
    const leave = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(leave);
    expect(leave.defaultPrevented).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /Noor.*Nog te bespreken/ }));
    expect(screen.getByRole("textbox", { name: "Gespreksinvoer" })).toHaveValue("");
    expect(confirm).not.toHaveBeenCalled();
    expect(mocks.dirty).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: /Milan.*Nog te bespreken/ }));
    expect(screen.getByRole("textbox", { name: "Gespreksinvoer" })).toHaveValue("Mijn onbewerkte verhaal over Milan.");
    fireEvent.change(screen.getByRole("textbox", { name: "Gespreksinvoer" }), { target: { value: "" } });
    expect(mocks.dirty).toHaveBeenLastCalledWith(false);
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.finalize).not.toHaveBeenCalled();
    expect(storage).not.toHaveBeenCalled();
  });

  it("applies a chat proposal as unsaved answers and retains the transcript warning after saving the assessment", async () => {
    vi.stubEnv("NODE_ENV", "development");
    render(<ConnectedPlayerReviews report={matchReport()} matchId={MATCH_ID} onDirtyChange={mocks.dirty} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Gespreksinvoer" }), { target: { value: "Gesprek dat alleen op dit scherm blijft." } });
    fireEvent.click(screen.getByRole("button", { name: "Pas chatvoorstel toe" }));
    expect(questionInput("positiveMoment")).toHaveValue(completeAnswers().positiveMoment.text);
    expect(mocks.dirty).toHaveBeenLastCalledWith(true);
    expect(mocks.save).not.toHaveBeenCalled();
    expect(mocks.finalize).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Concept bewaren" }));
    await screen.findByText("Concept opgeslagen bij deze wedstrijd. Je kunt later verdergaan.");
    expect(mocks.save).toHaveBeenCalledExactlyOnceWith({ matchId: MATCH_ID, playerId: PLAYER_ID, answers: completeAnswers(), expectedRevision: null });
    expect(mocks.dirty).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: "Gesprek" }));
    expect(screen.getByRole("textbox", { name: "Gespreksinvoer" })).toHaveValue("Gesprek dat alleen op dit scherm blijft.");
    expect(mocks.finalize).not.toHaveBeenCalled();
  });

  it("blocks player switching, mode changes and next while dictation or an interview request is active", () => {
    vi.stubEnv("NODE_ENV", "development");
    render(<ConnectedPlayerReviews report={matchReport()} matchId={MATCH_ID} onDirtyChange={mocks.dirty} />);
    fireEvent.click(screen.getByRole("button", { name: "Start spreken" }));
    expect(screen.getByRole("button", { name: /Noor.*Nog te bespreken/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Formulier" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Bewaar en volgende speler" })).toBeDisabled();
    expect(mocks.dirty).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: "Stop spreken" }));
    expect(screen.getByRole("button", { name: /Noor.*Nog te bespreken/ })).toBeEnabled();
    expect(mocks.dirty).toHaveBeenLastCalledWith(false);
  });

  it("keeps the production report on the existing manual form", () => {
    vi.stubEnv("NODE_ENV", "production");
    render(<ConnectedPlayerReviews report={matchReport()} matchId={MATCH_ID} onDirtyChange={mocks.dirty} />);
    expect(questionInput("positiveMoment")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Gesprek" })).not.toBeInTheDocument();
  });
});
