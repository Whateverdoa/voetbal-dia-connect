import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useMutation } from "convex/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { cardPeriodKey, amsterdamLocalToUtc } from "@/lib/cards/cardPeriods";
import type { StaffCardTeam } from "./CoachCardsPanel";
import { CardRoundManager } from "./CardRoundManager";
import { amsterdamInputTime } from "./cardUi";

const teamId = "t1" as Id<"teams">;
const p1 = "p1" as Id<"players">;
const p2 = "p2" as Id<"players">;
const roundId = "r1" as Id<"cardRounds">;
const data: StaffCardTeam = {
  team: { id: teamId, name: "JO13-1", slug: "jo13-1", isSelectionTeam: true },
  players: [
    { playerId: p1, name: "Jan", number: 7, positionPrimary: "CM", photoUrl: null, fcRatings: null, playStyleIds: [], recognitions: [], active: true, eligible: true },
    { playerId: p2, name: "Piet", number: 8, positionPrimary: "CM", photoUrl: null, fcRatings: null, playStyleIds: [], recognitions: [], active: true, eligible: true },
  ], memberships: [], rounds: [],
};
const create = Object.assign(vi.fn().mockResolvedValue(roundId), { withOptimisticUpdate: vi.fn() });
const veto = Object.assign(vi.fn().mockResolvedValue(null), { withOptimisticUpdate: vi.fn() });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useMutation).mockImplementation((reference) => reference === api.playerCards.createRound ? create : veto);
});

function openPanel(team = data) {
  render(<CardRoundManager data={team} />);
  fireEvent.click(screen.getByText("Team van de week & maand"));
}

describe("coach card round management", () => {
  it("publishes a direct coach selection without vote-only settings", async () => {
    openPanel();
    fireEvent.change(screen.getByLabelText("Keuzemethode"), { target: { value: "manual" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Jan" }));
    fireEvent.click(screen.getByRole("button", { name: "Kaarten publiceren" }));
    await waitFor(() => expect(create).toHaveBeenCalledWith({ teamId, kind: "week", mode: "manual", periodKey: cardPeriodKey(Date.now(), "week"), playerIds: [p1] }));
  });

  it("opens a vote with an explicit Amsterdam deadline and card count", async () => {
    openPanel();
    const deadline = amsterdamInputTime(Date.now() + 86400000);
    fireEvent.change(screen.getByLabelText("Aantal kaarten"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Sluiten (Nederlandse tijd)"), { target: { value: deadline } });
    fireEvent.click(screen.getByRole("button", { name: "Stemronde openen" }));
    await waitFor(() => expect(create).toHaveBeenCalledWith({ teamId, kind: "week", mode: "vote", periodKey: cardPeriodKey(Date.now(), "week"), winnerCount: 2, closesAt: amsterdamLocalToUtc(deadline) }));
  });

  it("requires a reason for veto and supports undo on the original round", async () => {
    const round: StaffCardTeam["rounds"][number] = { _id: roundId, kind: "week", mode: "vote", periodKey: "2026-09-28", status: "published", winnerCount: 1, closesAt: 1, publishedAt: 2, expiresAt: 3, candidateIds: [p1, p2], winnerIds: [p1], vetoedIds: [], ranking: [{ playerId: p1, count: 3 }, { playerId: p2, count: 2 }] };
    const { rerender } = render(<CardRoundManager data={{ ...data, rounds: [round] }} />);
    fireEvent.click(screen.getByText("Team van de week & maand"));
    fireEvent.click(screen.getByRole("button", { name: "Coachveto" }));
    expect(screen.getByLabelText("Interne reden")).toBeRequired();
    fireEvent.change(screen.getByLabelText("Interne reden"), { target: { value: "Deze week nog niet beschikbaar" } });
    fireEvent.click(screen.getByRole("button", { name: "Beslissing opslaan" }));
    await waitFor(() => expect(veto).toHaveBeenCalledWith({ roundId, playerId: p1, veto: true, reason: "Deze week nog niet beschikbaar" }));
    rerender(<CardRoundManager data={{ ...data, rounds: [{ ...round, winnerIds: [p2], vetoedIds: [p1] }] }} />);
    fireEvent.click(screen.getByRole("button", { name: "Veto terugdraaien" }));
    fireEvent.change(screen.getByLabelText("Interne reden"), { target: { value: "Weer beschikbaar" } });
    fireEvent.click(screen.getByRole("button", { name: "Beslissing opslaan" }));
    await waitFor(() => expect(veto).toHaveBeenCalledWith({ roundId, playerId: p1, veto: false, reason: "Weer beschikbaar" }));
  });
});
