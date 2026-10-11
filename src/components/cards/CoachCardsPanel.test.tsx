import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { FC_ATTRIBUTES, type FcRatings } from "@/lib/cards/fc27";
import { CoachCardsPanel, type StaffCardTeam } from "./CoachCardsPanel";

vi.mock("./CardRoundManager", () => ({ CardRoundManager: () => null }));
vi.mock("./VoterInvitationManager", () => ({ VoterInvitationManager: () => null }));
vi.mock("./FcPlayerShield", () => ({ FcPlayerShield: () => null }));

const teamId = "team1" as Id<"teams">;
const playerId = "p1" as Id<"players">;
const ratings = (score: number): FcRatings => ({ snl: score, sch: score, pas: score, dri: score, vrd: score, fys: score });
const data: StaffCardTeam = {
  team: { id: teamId, name: "DIA JO13-1", slug: "jo13-1", isSelectionTeam: true },
  players: [
    { playerId, name: "Jan", number: 7, positionPrimary: "CM", photoUrl: null, fcRatings: ratings(80), playStyleIds: [], recognitions: [], active: true, eligible: true },
    { playerId: "p2" as Id<"players">, name: "Piet", number: 8, positionPrimary: "CM", photoUrl: null, fcRatings: ratings(80), playStyleIds: [], recognitions: [], active: true, eligible: true },
  ],
  memberships: [], rounds: [],
};
const mutate = Object.assign(vi.fn().mockResolvedValue(null), { withOptimisticUpdate: vi.fn() });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useQuery).mockReturnValue(data);
  vi.mocked(useMutation).mockReturnValue(mutate);
});

function setAll(score: number) {
  for (const attribute of FC_ATTRIBUTES) fireEvent.change(screen.getByLabelText(new RegExp(`${attribute.label} · ${attribute.name}`)), { target: { value: String(score) } });
}

describe("coach card assessment", () => {
  it("calculates the rounded mean without a separate overall input", async () => {
    render(<CoachCardsPanel teamId={teamId} />);
    const scores = [84, 81, 79, 83, 60, 73];
    FC_ATTRIBUTES.forEach((attribute, index) => fireEvent.change(screen.getByLabelText(new RegExp(`${attribute.label} · ${attribute.name}`)), { target: { value: String(scores[index]) } }));
    expect(screen.getByText("77")).toBeInTheDocument();
    expect(screen.getAllByRole("spinbutton")).toHaveLength(6);
    fireEvent.click(screen.getByRole("button", { name: "Beoordeling opslaan" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledWith({ playerId, fcRatings: { snl: 84, sch: 81, pas: 79, dri: 83, vrd: 60, fys: 73 }, playStyleIds: [] }));
  });

  it("requires explicit confirmation when active teammate totals spread above ten", async () => {
    render(<CoachCardsPanel teamId={teamId} />);
    setAll(92);
    fireEvent.click(screen.getByRole("button", { name: "Beoordeling opslaan" }));
    expect(mutate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("bevestig");
    fireEvent.click(screen.getByRole("checkbox", { name: /Ik heb dit gecontroleerd/ }));
    fireEvent.click(screen.getByRole("button", { name: "Beoordeling opslaan" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledWith({ playerId, fcRatings: ratings(92), playStyleIds: [] }));
  });

  it("does not invent missing scores and allows clearing an assessment", async () => {
    vi.mocked(useQuery).mockReturnValue({ ...data, players: [{ ...data.players[0], fcRatings: null }] });
    render(<CoachCardsPanel teamId={teamId} />);
    expect(screen.getAllByRole("spinbutton").every((input) => (input as HTMLInputElement).value === "")).toBe(true);
    fireEvent.change(screen.getByLabelText(/SNL · Snelheid/), { target: { value: "80" } });
    fireEvent.click(screen.getByRole("button", { name: "Beoordeling opslaan" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledWith({ playerId, fcRatings: { snl: 80 }, playStyleIds: [] }));
    expect(screen.getByText(/Basistotaalscore:/)).toHaveTextContent("—");
    fireEvent.change(screen.getByLabelText(/SNL · Snelheid/), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Beoordeling opslaan" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledWith({ playerId, fcRatings: null, playStyleIds: [] }));
  });

  it("limits play styles to three without changing the rating", async () => {
    render(<CoachCardsPanel teamId={teamId} />);
    fireEvent.click(screen.getByRole("checkbox", { name: /Geplaatste bal/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Krachtig schot/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Dieptepass/ }));
    expect(screen.getByRole("checkbox", { name: /Nauwkeurige voorzet/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Beoordeling opslaan" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledWith({ playerId, fcRatings: ratings(80), playStyleIds: ["placed_ball", "power_shot", "through_pass"] }));
  });
});
