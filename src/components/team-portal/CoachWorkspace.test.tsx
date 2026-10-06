import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { emptyFeedback, type DemoState } from "@/lib/team-portal/types";
import { CoachWorkspace } from "./CoachWorkspace";

afterEach(cleanup);

function fixture(): DemoState {
  const published = { ...emptyFeedback(), compliment: "Je hielp je teamgenoot na een gemiste kans.", nextStep: "Kijk voor je eerste aanname." };
  return {
    version: 1,
    players: [
      { id: "player-1", name: "Milan", number: 8, position: "Middenvelder", qualities: ["Samenspel"], motto: "Samen groeien" },
      { id: "player-2", name: "Noor", number: 1, position: "Keeper", qualities: ["Reddingen"], motto: "Blijven proberen" },
    ],
    guardians: [],
    matches: [{ id: "match-1", opponent: "Beek Vooruit", dateLabel: "Zaterdag", score: "3–2", phase: "preparing", participantIds: ["player-1", "player-2"] }],
    feedback: [{ id: "feedback-1", playerId: "player-1", kind: "match", matchId: "match-1", draft: { ...published }, published: { ...published }, updatedAt: 1, publishedAt: 1 }],
    highlights: [
      { id: "highlight-1", matchId: "match-1", playerId: "player-1", submittedBy: "player-2", category: "Sportiviteit", description: "Hielp een speler overeind.", status: "pending" },
      { id: "highlight-2", matchId: "another-match", playerId: "player-1", submittedBy: "player-2", category: "Mooie pass", description: "Een moment uit een andere wedstrijd.", status: "pending" },
    ],
    votes: [],
  };
}

describe("CoachWorkspace", () => {
  it("keeps the published version visible and requires saving before republishing edits", async () => {
    const user = userEvent.setup();
    const state = fixture();
    const onCommand = vi.fn(() => true);
    const { rerender } = render(<CoachWorkspace state={state} matchId="match-1" onCommand={onCommand} />);
    expect(screen.getByRole("button", { name: "Opnieuw publiceren" })).toBeDisabled();

    const compliment = screen.getByLabelText("Dit ging goed");
    await user.clear(compliment);
    await user.type(compliment, "Je vond steeds een vrije teamgenoot.");
    expect(screen.getByText("Je hielp je teamgenoot na een gemiste kans.")).toBeVisible();
    expect(screen.getByRole("button", { name: "Opnieuw publiceren" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Concept bewaren" }));
    const savedContent = { ...state.feedback[0].draft, compliment: "Je vond steeds een vrije teamgenoot." };
    expect(onCommand).toHaveBeenLastCalledWith({ type: "saveFeedback", playerId: "player-1", kind: "match", matchId: "match-1", content: savedContent });

    const savedState = { ...state, feedback: [{ ...state.feedback[0], draft: savedContent }] };
    rerender(<CoachWorkspace state={savedState} matchId="match-1" onCommand={onCommand} />);
    expect(screen.getByRole("button", { name: "Opnieuw publiceren" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Opnieuw publiceren" }));
    expect(onCommand).toHaveBeenLastCalledWith({ type: "publishFeedback", feedbackId: "feedback-1" });
  });

  it("resets the editor when selecting another player and supports unfinished development drafts", async () => {
    const user = userEvent.setup();
    const onCommand = vi.fn(() => true);
    render(<CoachWorkspace state={fixture()} matchId="match-1" onCommand={onCommand} />);
    await user.type(screen.getByLabelText("Dit ging goed"), " Nog niet bewaard.");
    await user.selectOptions(screen.getByLabelText("Speler"), "player-2");
    expect(screen.getByLabelText("Dit ging goed")).toHaveValue("");

    await user.click(screen.getByRole("button", { name: "Ontwikkeling" }));
    await user.selectOptions(screen.getByLabelText("Samenspel"), "Sterk punt");
    await user.type(screen.getByLabelText("Dit ging goed"), "Je helpt je verdedigers met aanwijzingen.");
    expect(screen.getByRole("button", { name: /^Publiceren$/ })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Concept bewaren" }));
    expect(onCommand).toHaveBeenLastCalledWith({
      type: "saveFeedback", playerId: "player-2", kind: "periodic",
      content: { ...emptyFeedback(), compliment: "Je helpt je verdedigers met aanwijzingen.", skills: { ...emptyFeedback().skills, samenspel: "Sterk punt" } },
    });
  });

  it("moderates only the selected match and freezes moderation once voting has opened", async () => {
    const user = userEvent.setup();
    const onCommand = vi.fn(() => true);
    const state = fixture();
    const { rerender } = render(<CoachWorkspace state={state} matchId="match-1" onCommand={onCommand} />);
    expect(screen.queryByText("Een moment uit een andere wedstrijd.")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Goedkeuren: Hielp een speler overeind." }));
    expect(onCommand).toHaveBeenLastCalledWith({ type: "reviewHighlight", highlightId: "highlight-1", approved: true });

    rerender(<CoachWorkspace state={{ ...state, matches: [{ ...state.matches[0], phase: "voting" }] }} matchId="match-1" onCommand={onCommand} />);
    expect(screen.getByRole("button", { name: "Goedkeuren: Hielp een speler overeind." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Afwijzen: Hielp een speler overeind." })).toBeDisabled();
  });
});
