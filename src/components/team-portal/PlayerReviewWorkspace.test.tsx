import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { applyDemoCommand } from "@/lib/team-portal/commands";
import { createDemoState } from "@/lib/team-portal/fixtures";
import { emptyPlayerReview } from "@/lib/team-portal/playerReview";
import type { DemoCommand, DemoState } from "@/lib/team-portal/types";
import type { PlayerReviewFormProps } from "./PlayerReviewForm";
import { PublishedPlayerReviews } from "./PublishedPlayerReviews";
import { PlayerReviewWorkspace } from "./PlayerReviewWorkspace";

vi.mock("./PlayerReviewForm", () => ({
  PlayerReviewForm: ({ player, answers, onChange, onSave, onPublish, saveDisabled, publishDisabled, recordedMoments }: PlayerReviewFormProps) => <div>
    <h3>Formulier voor {player.name}</h3>
    {(["positiveMoment", "teamwork", "nextStep"] as const).map((id) => <label key={id}>{id}<textarea aria-label={id} value={answers[id].text} onChange={(event) => onChange({ ...answers, [id]: { text: event.target.value, notObserved: false } })} /></label>)}
    <button type="button" disabled={saveDisabled} onClick={onSave}>Bewaar formulier</button>
    <button type="button" disabled={publishDisabled} onClick={onPublish}>Deel formulier</button>
    <ul aria-label="Vastgelegde momenten">{recordedMoments?.map((moment) => <li key={moment.id}>{moment.text}</li>)}</ul>
  </div>,
}));

const NOW = 1800000000000;

function Harness({ initialState = createDemoState(NOW), initialMatchId = "m3", onCommand = () => undefined, failSave = false }: {
  initialState?: DemoState;
  initialMatchId?: string;
  onCommand?: (command: DemoCommand) => void;
  failSave?: boolean;
}) {
  const [state, setState] = useState(initialState);
  const [matchId, setMatchId] = useState(initialMatchId);
  return <>
    <button type="button" onClick={() => setMatchId(matchId === "m3" ? "m1" : "m3")}>Andere wedstrijd</button>
    <PlayerReviewWorkspace key={matchId} state={state} matchId={matchId} onCommand={(command) => {
      onCommand(command);
      if (failSave && command.type === "savePlayerReview") return false;
      try {
        setState(applyDemoCommand(state, { role: "coach" }, command, NOW));
        return true;
      } catch {
        return false;
      }
    }} />
    <section aria-label="Weergave speler"><PublishedPlayerReviews state={state} actor={{ role: "player", playerId: "p1" }} playerId="p1" /></section>
    <section aria-label="Weergave ouder"><PublishedPlayerReviews state={state} actor={{ role: "parent", guardianId: "family1" }} playerId="p1" /></section>
    <section aria-label="Weergave ander kind"><PublishedPlayerReviews state={state} actor={{ role: "parent", guardianId: "family1" }} playerId="p10" /></section>
  </>;
}

function answerCore(positive = "Je onderschepte de pass en hield de bal in het team.") {
  fireEvent.change(screen.getByRole("textbox", { name: "positiveMoment" }), { target: { value: positive } });
  fireEvent.change(screen.getByRole("textbox", { name: "teamwork" }), { target: { value: "Je hielp je teamgenoot met een vrije afspeelmogelijkheid." } });
  fireEvent.change(screen.getByRole("textbox", { name: "nextStep" }), { target: { value: "Oefen om vóór de aanname over je schouder te kijken." } });
}

describe("post-match player review workspace", () => {
  it("keeps drafts private, publishes only to the right player and parent, and preserves the last shared version while editing", () => {
    render(<Harness />);
    const playerView = within(screen.getByRole("region", { name: "Weergave speler" }));
    const parentView = within(screen.getByRole("region", { name: "Weergave ouder" }));
    const otherChildView = within(screen.getByRole("region", { name: "Weergave ander kind" }));
    const original = "Je onderschepte de pass en hield de bal in het team.";
    answerCore(original);
    expect(screen.getByRole("button", { name: "Deel formulier" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Bewaar formulier" }));
    expect(playerView.queryByText(original)).not.toBeInTheDocument();
    expect(parentView.queryByText(original)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Deel formulier" }));
    expect(playerView.getByText(original)).toBeInTheDocument();
    expect(parentView.getByText(original)).toBeInTheDocument();
    expect(otherChildView.queryByText(original)).not.toBeInTheDocument();

    const correction = "Je won de bal terug bij de zijlijn.";
    fireEvent.change(screen.getByRole("textbox", { name: "positiveMoment" }), { target: { value: correction } });
    expect(screen.getByRole("button", { name: "Deel formulier" })).toBeDisabled();
    expect(playerView.getByText(original)).toBeInTheDocument();
    expect(playerView.queryByText(correction)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Bewaar formulier" }));
    expect(parentView.getByText(original)).toBeInTheDocument();
    expect(parentView.queryByText(correction)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Deel formulier" }));
    expect(playerView.getByText(correction)).toBeInTheDocument();
    expect(playerView.queryByText(original)).not.toBeInTheDocument();
  });

  it("saves a dirty answer under its current player when moving through the queue", () => {
    const commands = vi.fn();
    render(<Harness onCommand={commands} />);
    fireEvent.change(screen.getByRole("textbox", { name: "positiveMoment" }), { target: { value: "Moment van Milan." } });
    fireEvent.click(screen.getByRole("button", { name: /Noor #1/ }));
    expect(commands).toHaveBeenCalledOnce();
    expect(commands).toHaveBeenLastCalledWith(expect.objectContaining({ type: "savePlayerReview", matchId: "m3", playerId: "p1", answers: expect.objectContaining({ positiveMoment: { text: "Moment van Milan.", notObserved: false } }) }));
    expect(screen.getByRole("heading", { name: "Formulier voor Noor" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "positiveMoment" })).toHaveValue("");
    fireEvent.change(screen.getByRole("textbox", { name: "positiveMoment" }), { target: { value: "Moment van Noor." } });
    fireEvent.click(screen.getByRole("button", { name: "Bewaar en volgende speler" }));
    expect(commands).toHaveBeenCalledTimes(2);
    expect(commands).toHaveBeenLastCalledWith(expect.objectContaining({ type: "savePlayerReview", matchId: "m3", playerId: "p2" }));
    expect(screen.getByRole("heading", { name: "Formulier voor Sam" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Speler voor nabespreking" }), { target: { value: "p1" } });
    expect(screen.getByRole("textbox", { name: "positiveMoment" })).toHaveValue("Moment van Milan.");
    fireEvent.change(screen.getByRole("combobox", { name: "Speler voor nabespreking" }), { target: { value: "p2" } });
    expect(screen.getByRole("textbox", { name: "positiveMoment" })).toHaveValue("Moment van Noor.");
  });

  it("retains the current player and answers if automatic saving fails", () => {
    render(<Harness failSave />);
    fireEvent.change(screen.getByRole("textbox", { name: "positiveMoment" }), { target: { value: "Dit concept moet blijven staan." } });
    fireEvent.click(screen.getByRole("button", { name: /Noor #1/ }));
    expect(screen.getByRole("heading", { name: "Formulier voor Milan" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "positiveMoment" })).toHaveValue("Dit concept moet blijven staan.");
    expect(screen.getByRole("status")).toHaveTextContent("Bewaren lukte niet");
  });

  it("does not carry unsaved edits into another match when the keyed workspace changes", () => {
    let state = createDemoState(NOW);
    for (const [matchId, text] of [["m3", "Bewaard voor Duinrand."], ["m1", "Bewaard voor Groenwit."]]) {
      state = applyDemoCommand(state, { role: "coach" }, { type: "savePlayerReview", matchId, playerId: "p1", answers: { ...emptyPlayerReview(), positiveMoment: { text, notObserved: false } } }, NOW);
    }
    const commands = vi.fn();
    render(<Harness initialState={state} onCommand={commands} />);
    expect(screen.getByRole("textbox", { name: "positiveMoment" })).toHaveValue("Bewaard voor Duinrand.");
    fireEvent.change(screen.getByRole("textbox", { name: "positiveMoment" }), { target: { value: "Onbewaarde wijziging." } });
    fireEvent.click(screen.getByRole("button", { name: "Andere wedstrijd" }));
    expect(screen.getByRole("textbox", { name: "positiveMoment" })).toHaveValue("Bewaard voor Groenwit.");
    fireEvent.click(screen.getByRole("button", { name: "Andere wedstrijd" }));
    expect(screen.getByRole("textbox", { name: "positiveMoment" })).toHaveValue("Bewaard voor Duinrand.");
    expect(commands).not.toHaveBeenCalled();
  });

  it("offers participating players only and scopes recorded reminders to the selected player and match", () => {
    const state = createDemoState(NOW);
    state.matches.find((match) => match.id === "m3")!.participantIds = ["p1", "p2"];
    state.highlights.push({ id: "pending-private", matchId: "m3", playerId: "p1", category: "Mooie pass", description: "Nog niet goedgekeurd moment.", status: "pending", submittedBy: "p2" });
    render(<Harness initialState={state} />);
    const selector = within(screen.getByRole("combobox", { name: "Speler voor nabespreking" }));
    expect(selector.getAllByRole("option")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: /Sam #4/ })).not.toBeInTheDocument();
    const moments = within(screen.getByRole("list", { name: "Vastgelegde momenten" }));
    expect(moments.getByText("Milan keek op, speelde Isa vrij en liep meteen weer mee.")).toBeInTheDocument();
    expect(moments.queryByText("Nog niet goedgekeurd moment.")).not.toBeInTheDocument();
    expect(moments.queryByText("Robin pakte de bal af en bouwde rustig weer op.")).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox", { name: "Speler voor nabespreking" }), { target: { value: "p2" } });
    expect(within(screen.getByRole("list", { name: "Vastgelegde momenten" })).queryAllByRole("listitem")).toHaveLength(0);
  });

  it("shows a clear empty state when nobody is recorded as a participant", () => {
    const state = createDemoState(NOW);
    state.matches.find((match) => match.id === "m3")!.participantIds = [];
    render(<Harness initialState={state} />);
    expect(screen.getByText("Voor deze wedstrijd zijn nog geen deelnemende spelers bekend.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });
});
