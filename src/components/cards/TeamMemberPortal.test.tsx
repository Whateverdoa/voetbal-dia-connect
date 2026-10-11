import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { TeamMemberPortal } from "./TeamMemberPortal";

vi.mock("./TeamDeckGrid", () => ({ TeamDeckGrid: () => <div>Kaartenoverzicht</div> }));

type Portal = NonNullable<FunctionReturnType<typeof api.playerCards.getPortal>>;
const p1 = "p1" as Id<"players">;
const p2 = "p2" as Id<"players">;
const p3 = "p3" as Id<"players">;
const playerSeat = "s1" as Id<"cardVoterMemberships">;
const parentSeat = "s2" as Id<"cardVoterMemberships">;
const siblingSeat = "s3" as Id<"cardVoterMemberships">;
const roundId = "r1" as Id<"cardRounds">;
const data: Portal = {
  team: { id: "t1" as Id<"teams">, name: "DIA JO13-1", slug: "jo13-1" },
  seats: [{ _id: playerSeat, playerId: p1, kind: "player" }, { _id: parentSeat, playerId: p1, kind: "parent" }, { _id: siblingSeat, playerId: p2, kind: "parent" }],
  players: [
    { playerId: p1, displayName: "Jan", number: 7, positionPrimary: "CM", positionSecondary: null, photoUrl: null, cardProfile: null, showFullIdentity: false, fcRatings: null, playStyleIds: [], recognitions: [] },
    { playerId: p2, displayName: "Piet", number: 8, positionPrimary: "CM", positionSecondary: null, photoUrl: null, cardProfile: null, showFullIdentity: false, fcRatings: null, playStyleIds: [], recognitions: [] },
    { playerId: p3, displayName: "Kees", number: 9, positionPrimary: "ST", positionSecondary: null, photoUrl: null, cardProfile: null, showFullIdentity: false, fcRatings: null, playStyleIds: [], recognitions: [] },
  ],
  rounds: [{ _id: roundId, kind: "week", periodKey: "2026-10-05", mode: "vote", status: "open", winnerCount: 1, closesAt: Date.now() + 86400000, publishedAt: null, expiresAt: null, candidateIds: [p1, p2, p3], candidates: [p1, p2, p3], winnerIds: [], myBallots: [{ membershipId: playerSeat, playerIds: [] }, { membershipId: parentSeat, playerIds: [] }, { membershipId: siblingSeat, playerIds: [] }] }],
};
const cast = Object.assign(vi.fn().mockResolvedValue(null), { withOptimisticUpdate: vi.fn() });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useConvexAuth).mockReturnValue({ isAuthenticated: true, isLoading: false, isRefreshing: false });
  vi.mocked(useQuery).mockReturnValue(data);
  vi.mocked(useMutation).mockReturnValue(cast);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function openVoting() {
  render(<TeamMemberPortal teamSlug="jo13-1" />);
  fireEvent.click(screen.getByRole("tab", { name: "Stemmen" }));
}

describe("team member voting portal", () => {
  it("prevents a player choosing themselves but allows the parent to choose that child", async () => {
    openVoting();
    const player = screen.getByRole("group", { name: "Spelersstem van Jan" });
    expect(within(player).queryByRole("checkbox", { name: /Jan/ })).not.toBeInTheDocument();
    const parent = screen.getByRole("group", { name: "Ouderstem voor Jan" });
    fireEvent.click(within(parent).getByRole("checkbox", { name: /Jan/ }));
    expect(within(parent).getByRole("checkbox", { name: /Piet/ })).toBeDisabled();
    fireEvent.submit(parent.closest("form") as HTMLFormElement);
    await waitFor(() => expect(cast).toHaveBeenCalledWith({ roundId, membershipId: parentSeat, playerIds: [p1] }));
  });

  it("keeps the parent votes for multiple children separate", async () => {
    openVoting();
    const first = screen.getByRole("group", { name: "Ouderstem voor Jan" });
    const second = screen.getByRole("group", { name: "Ouderstem voor Piet" });
    fireEvent.click(within(first).getByRole("checkbox", { name: /Jan/ }));
    fireEvent.click(within(second).getByRole("checkbox", { name: /Kees/ }));
    fireEvent.submit(first.closest("form") as HTMLFormElement);
    fireEvent.submit(second.closest("form") as HTMLFormElement);
    await waitFor(() => expect(cast).toHaveBeenCalledTimes(2));
    expect(cast).toHaveBeenCalledWith({ roundId, membershipId: parentSeat, playerIds: [p1] });
    expect(cast).toHaveBeenCalledWith({ roundId, membershipId: siblingSeat, playerIds: [p3] });
  });

  it("does not offer a ballot for seats added after the round opened", () => {
    vi.mocked(useQuery).mockReturnValue({ ...data, rounds: [{ ...data.rounds[0], myBallots: [] }] });
    openVoting();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByText("Je stemrecht doet vanaf een volgende ronde mee.")).toBeInTheDocument();
  });

  it("allows changing a saved ballot until the deadline", async () => {
    vi.mocked(useQuery).mockReturnValue({ ...data, rounds: [{ ...data.rounds[0], myBallots: [{ membershipId: parentSeat, playerIds: [p1] }] }] });
    openVoting();
    const parent = screen.getByRole("group", { name: "Ouderstem voor Jan" });
    expect(within(parent).getByRole("checkbox", { name: /Jan/ })).toBeChecked();
    fireEvent.click(within(parent).getByRole("checkbox", { name: /Jan/ }));
    fireEvent.click(within(parent).getByRole("checkbox", { name: /Kees/ }));
    fireEvent.submit(parent.closest("form") as HTMLFormElement);
    await waitFor(() => expect(cast).toHaveBeenCalledWith({ roundId, membershipId: parentSeat, playerIds: [p3] }));
  });

  it("frees a selection slot when a candidate withdraws consent during voting", async () => {
    const original = { ...data, rounds: [{ ...data.rounds[0], myBallots: [{ membershipId: parentSeat, playerIds: [p1] }] }] };
    vi.mocked(useQuery).mockReturnValue(original);
    const { rerender } = render(<TeamMemberPortal teamSlug="jo13-1" />);
    fireEvent.click(screen.getByRole("tab", { name: "Stemmen" }));
    const parent = screen.getByRole("group", { name: "Ouderstem voor Jan" });
    expect(within(parent).getByRole("checkbox", { name: /Piet/ })).toBeDisabled();
    vi.mocked(useQuery).mockReturnValue({ ...original, rounds: [{ ...original.rounds[0], candidateIds: [p2, p3], candidates: [p2, p3], myBallots: [{ membershipId: parentSeat, playerIds: [] }] }] });
    rerender(<TeamMemberPortal teamSlug="jo13-1" />);
    expect(within(parent).queryByRole("checkbox", { name: /Jan/ })).not.toBeInTheDocument();
    expect(within(parent).getByRole("checkbox", { name: /Piet/ })).not.toBeDisabled();
    fireEvent.click(within(parent).getByRole("checkbox", { name: /Piet/ }));
    fireEvent.submit(parent.closest("form") as HTMLFormElement);
    await waitFor(() => expect(cast).toHaveBeenCalledWith({ roundId, membershipId: parentSeat, playerIds: [p2] }));
  });

  it("disables voting at the deadline without waiting for scheduler publication", () => {
    vi.useFakeTimers();
    vi.mocked(useQuery).mockReturnValue({ ...data, rounds: [{ ...data.rounds[0], closesAt: Date.now() + 1000 }] });
    openVoting();
    expect(screen.getAllByRole("button", { name: "Stem opslaan" })).toHaveLength(3);
    act(() => vi.advanceTimersByTime(1001));
    expect(screen.queryByRole("button", { name: "Stem opslaan" })).not.toBeInTheDocument();
    expect(screen.getByText("De stemming is gesloten. De uitslag verschijnt automatisch.")).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox").every((input) => (input as HTMLInputElement).disabled || input.closest("fieldset")?.disabled)).toBe(true);
  });

  it("shows an invitation entry instead of staff onboarding when access is missing", () => {
    vi.mocked(useQuery).mockReturnValue(null);
    render(<TeamMemberPortal teamSlug="jo13-1" />);
    expect(screen.getByText("Nog geen toegang")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Coach|Admin/ })).not.toBeInTheDocument();
  });

  it("preserves the local portal destination for signed-out members", () => {
    vi.mocked(useConvexAuth).mockReturnValue({ isAuthenticated: false, isLoading: false, isRefreshing: false });
    render(<TeamMemberPortal teamSlug="jo13-1" />);
    expect(screen.getByRole("link", { name: "Inloggen" })).toHaveAttribute("href", "/sign-in?returnTo=%2Fteam%2Fjo13-1%2Fapp");
  });
});
