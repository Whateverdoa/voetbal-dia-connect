import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { VotingPanel } from "./VotingPanel";
import type { DemoState } from "@/lib/team-portal/types";

const now = 1_800_000_000_000;

function fixture(phase: "preparing" | "voting" | "closed" = "voting"): DemoState {
  return {
    version: 1,
    players: [
      { id: "a", name: "Amir", number: 4, position: "Verdediger", qualities: [], motto: "" },
      { id: "b", name: "Bram", number: 8, position: "Middenvelder", qualities: [], motto: "" },
      { id: "c", name: "Cato", number: 1, position: "Keeper", qualities: [], motto: "" },
    ],
    guardians: [{ id: "parent", name: "Ouder", childrenIds: ["a"] }],
    matches: [{ id: "m", opponent: "Voorbeeldclub", dateLabel: "Vandaag", score: "2–2", phase, participantIds: ["a", "b", "c"], openedAt: now, closesAt: now + 86_400_000, playerCandidateIds: ["a", "b", "c"], highlightCandidateIds: ["h-a", "h-b"] }],
    feedback: [],
    highlights: [
      { id: "h-a", matchId: "m", playerId: "a", category: "Verdedigen", description: "Blokte het schot.", status: "approved", submittedBy: "coach" },
      { id: "h-b", matchId: "m", playerId: "b", category: "Mooie pass", description: "Een pass over de hele breedte.", minute: 24, status: "approved", submittedBy: "coach" },
      { id: "h-c", matchId: "m", playerId: "c", category: "Redding", description: "Dit moment is na het openen toegevoegd.", status: "approved", submittedBy: "coach" },
    ],
    votes: [],
  };
}

describe("VotingPanel", () => {
  it("lets a participant submit two positive ballots without offering themselves or late highlights", async () => {
    const user = userEvent.setup();
    const onCommand = vi.fn(() => true);
    render(<VotingPanel state={fixture()} actor={{ role: "player", playerId: "a" }} matchId="m" now={now} onCommand={onCommand} />);

    const playerSelect = screen.getByRole("combobox", { name: "Kies een teamgenoot" });
    expect(within(playerSelect).queryByRole("option", { name: "Amir · #4" })).not.toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: /Verdedigen · Amir/ })).not.toBeInTheDocument();
    expect(screen.queryByText("Dit moment is na het openen toegevoegd.")).not.toBeInTheDocument();
    expect(screen.queryByText("Applaus voor elkaar")).not.toBeInTheDocument();

    await user.selectOptions(playerSelect, "b");
    await user.click(screen.getByRole("radio", { name: "Goed samengespeeld" }));
    await user.click(screen.getByRole("button", { name: "Bewaar mijn spelersstem" }));
    expect(onCommand).toHaveBeenCalledWith({ type: "castVote", matchId: "m", kind: "player", targetId: "b", reason: "Goed samengespeeld" });

    await user.click(screen.getByRole("radio", { name: /Mooie pass · Bram/ }));
    await user.click(screen.getByRole("button", { name: "Bewaar mijn actiestem" }));
    expect(onCommand).toHaveBeenCalledWith({ type: "castVote", matchId: "m", kind: "highlight", targetId: "h-b" });
  });

  it("shows only the active player's saved choices and resets drafts when changing actor", async () => {
    const user = userEvent.setup();
    const state = fixture();
    state.votes = [
      { matchId: "m", voterId: "a", kind: "player", targetId: "b", reason: "Goed samengespeeld" },
      { matchId: "m", voterId: "c", kind: "player", targetId: "a", reason: "Hielp het team" },
    ];
    const props = { state, matchId: "m", now, onCommand: vi.fn(() => true) };
    const { rerender } = render(<VotingPanel {...props} actor={{ role: "player", playerId: "a" }} />);
    expect(screen.getByText("Bram · Goed samengespeeld")).toBeInTheDocument();
    expect(screen.queryByText("Amir · Hielp het team")).not.toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox", { name: "Kies een teamgenoot" }), "c");

    rerender(<VotingPanel {...props} actor={{ role: "player", playerId: "b" }} />);
    expect(screen.getByRole("combobox", { name: "Kies een teamgenoot" })).toHaveValue("");
    expect(screen.queryByText("Jouw opgeslagen keuze")).not.toBeInTheDocument();
  });

  it("lets players propose a teammate's moment and keeps other pending proposals private", async () => {
    const user = userEvent.setup();
    const state = fixture("preparing");
    state.highlights.push({ id: "pending", matchId: "m", playerId: "a", category: "Doorzetten", description: "Wachtend voorstel van iemand anders.", status: "pending", submittedBy: "c" });
    const onCommand = vi.fn(() => true);
    render(<VotingPanel state={state} actor={{ role: "player", playerId: "a" }} matchId="m" now={now} onCommand={onCommand} />);
    expect(screen.queryByText("Wachtend voorstel van iemand anders.")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Stel een mooi moment voor" }));
    const playerSelect = screen.getByRole("combobox", { name: "Wie wil je een compliment geven?" });
    expect(within(playerSelect).queryByRole("option", { name: "Amir · #4" })).not.toBeInTheDocument();
    await user.selectOptions(playerSelect, "c");
    await user.selectOptions(screen.getByRole("combobox", { name: "Wat viel je op?" }), "Sportiviteit");
    await user.type(screen.getByRole("textbox", { name: "Beschrijf het moment" }), "  Hielp de tegenstander overeind.  ");
    await user.type(screen.getByRole("spinbutton", { name: /Minuut/ }), "17");
    await user.click(screen.getByRole("button", { name: "Stuur naar de coach" }));
    expect(onCommand).toHaveBeenCalledWith({ type: "addHighlight", matchId: "m", playerId: "c", category: "Sportiviteit", description: "Hielp de tegenstander overeind.", minute: 17 });
    expect(screen.getByText("Mooi gezien! Je voorstel is naar de coach gegaan.")).toBeInTheDocument();
  });

  it("blocks the coach from opening until proposals are reviewed", async () => {
    const user = userEvent.setup();
    const state = fixture("preparing");
    state.highlights.push({ id: "pending", matchId: "m", playerId: "a", category: "Doorzetten", description: "Bleef gaan.", status: "pending", submittedBy: "b" });
    const props = { actor: { role: "coach" } as const, matchId: "m", now, onCommand: vi.fn(() => true) };
    const { rerender } = render(<VotingPanel {...props} state={state} />);
    expect(screen.getByRole("button", { name: /Open stemronde/ })).toBeDisabled();
    expect(screen.getByText(/Beoordeel eerst het wachtende voorstel/)).toBeInTheDocument();

    rerender(<VotingPanel {...props} state={{ ...state, highlights: [] }} />);
    await user.click(screen.getByRole("button", { name: /Open stemronde/ }));
    expect(props.onCommand).toHaveBeenCalledWith({ type: "openVoting", matchId: "m" });
  });

  it("gives parents a read-only view without individual ballots", () => {
    const state = fixture();
    state.votes.push({ matchId: "m", voterId: "a", kind: "player", targetId: "b", reason: "Goed samengespeeld" });
    render(<VotingPanel state={state} actor={{ role: "parent", guardianId: "parent" }} matchId="m" now={now} onCommand={vi.fn(() => true)} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByText("Bram · Goed samengespeeld")).not.toBeInTheDocument();
    expect(screen.getByText("Een pass over de hele breedte.")).toBeInTheDocument();
  });

  it("closes at the deadline and celebrates a tied result without exposing vote totals", () => {
    const state = fixture();
    state.votes = [
      { matchId: "m", voterId: "a", kind: "player", targetId: "b", reason: "Goed samengespeeld" },
      { matchId: "m", voterId: "b", kind: "player", targetId: "a", reason: "Hielp het team" },
    ];
    render(<VotingPanel state={state} actor={{ role: "player", playerId: "a" }} matchId="m" now={now + 86_400_000} onCommand={vi.fn(() => true)} />);
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.getByText("Amir & Bram")).toBeInTheDocument();
    expect(screen.getByText("Evenveel waardering. Samen in het zonnetje!")).toBeInTheDocument();
    expect(screen.getByText(/Er zijn geen actiestemmen uitgebracht/)).toBeInTheDocument();
    expect(screen.queryByText(/\d+ stem(?:men)?/)).not.toBeInTheDocument();
  });
});
