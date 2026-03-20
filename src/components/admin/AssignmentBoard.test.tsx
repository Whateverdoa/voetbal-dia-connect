import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { getAssignmentDateKey, getAssignmentDateLabel } from "@/lib/admin/assignmentBoard";
import { AssignmentBoard } from "./AssignmentBoard";

const mockUseQuery = vi.mocked(useQuery);
const mockUseMutation = vi.mocked(useMutation);

const matchDayOne = new Date(2026, 2, 14, 10, 0).getTime();
const matchDayTwo = new Date(2026, 2, 21, 11, 30).getTime();
const matchDayOneLabel = getAssignmentDateLabel(matchDayOne);
const matchDayTwoLabel = getAssignmentDateLabel(matchDayTwo);

const boardMatches = [
  {
    _id: "match-1",
    clubId: "club-dia",
    clubName: "vv DIA",
    teamId: "team-1",
    teamName: "JO11-1",
    opponent: "SCO",
    isHome: true,
    status: "scheduled",
    publicCode: "AAA111",
    scheduledAt: matchDayOne,
    currentQuarter: 1,
    quarterCount: 4,
    homeScore: 0,
    awayScore: 0,
    coachName: "Coach A",
    refereeName: null,
    dateKey: getAssignmentDateKey(matchDayOne),
    dateLabel: matchDayOneLabel,
    matchQualificationTags: ["JO11", "8v8"],
    refereeQualificationTags: [],
    qualificationState: "onbekend",
  },
  {
    _id: "match-2",
    clubId: "club-dia",
    clubName: "vv DIA",
    teamId: "team-1",
    teamName: "JO11-1",
    opponent: "Gilze",
    isHome: false,
    status: "finished",
    publicCode: "BBB222",
    scheduledAt: matchDayOne,
    currentQuarter: 2,
    quarterCount: 4,
    homeScore: 1,
    awayScore: 2,
    coachName: "Coach A",
    refereeName: "Ref A",
    refereeId: "ref-1",
    dateKey: getAssignmentDateKey(matchDayOne),
    dateLabel: matchDayOneLabel,
    matchQualificationTags: ["JO11", "8v8"],
    refereeQualificationTags: ["JO11", "8v8"],
    qualificationState: "geschikt",
  },
  {
    _id: "match-3",
    clubId: "club-dia",
    clubName: "vv DIA",
    teamId: "team-2",
    teamName: "JO12-1",
    opponent: "Baronie",
    isHome: true,
    status: "scheduled",
    publicCode: "CCC333",
    scheduledAt: matchDayTwo,
    currentQuarter: 1,
    quarterCount: 4,
    homeScore: 0,
    awayScore: 0,
    coachName: "Coach B",
    refereeName: null,
    dateKey: getAssignmentDateKey(matchDayTwo),
    dateLabel: matchDayTwoLabel,
    matchQualificationTags: ["JO12", "8v8"],
    refereeQualificationTags: [],
    qualificationState: "onbekend",
  },
  {
    _id: "match-4",
    clubId: "club-other",
    clubName: "Testclub",
    teamId: "team-3",
    teamName: "JO13-1",
    opponent: "TSC",
    isHome: true,
    status: "scheduled",
    publicCode: "DDD444",
    scheduledAt: matchDayOne,
    currentQuarter: 1,
    quarterCount: 4,
    homeScore: 0,
    awayScore: 0,
    coachName: "Coach C",
    refereeName: null,
    dateKey: getAssignmentDateKey(matchDayOne),
    dateLabel: matchDayOneLabel,
    matchQualificationTags: ["JO13", "11v11"],
    refereeQualificationTags: [],
    qualificationState: "onbekend",
  },
] as const;

const referees = [
  { id: "ref-1", name: "Ref A", qualificationTags: ["JO11", "8v8"] },
  { id: "ref-2", name: "Ref B", qualificationTags: ["JO12", "8v8"] },
] as const;

describe("AssignmentBoard", () => {
  const mockUpdateMatch = vi.fn();
  const mockAddPlayerToMatch = vi.fn();
  const mockCreatePlayerAndAddToMatch = vi.fn();
  const mockDeleteMatch = vi.fn();
  const mockCreateMatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    mockUseQuery.mockImplementation((...args) => {
      const [query] = args;
      if (query === api.admin.listAssignmentBoard) return boardMatches as never;
      if (query === api.admin.listAllTeams) return [] as never;
      if (query === api.admin.listCoaches) return [] as never;
      if (query === api.matches.listActiveReferees) return referees as never;
      if (query === api.admin.listTeamPlayersNotInMatch) return [] as never;
      if (query === api.admin.listPlayersByTeam) return [] as never;
      return undefined;
    });

    mockUseMutation.mockImplementation((mutation) => {
      if (mutation === api.admin.updateMatch) return mockUpdateMatch as never;
      if (mutation === api.admin.addPlayerToMatch) return mockAddPlayerToMatch as never;
      if (mutation === api.admin.createPlayerAndAddToMatch) return mockCreatePlayerAndAddToMatch as never;
      if (mutation === api.admin.deleteMatch) return mockDeleteMatch as never;
      if (mutation === api.admin.createMatch) return mockCreateMatch as never;
      return vi.fn() as never;
    });

    mockUpdateMatch.mockResolvedValue(undefined);
    mockAddPlayerToMatch.mockResolvedValue(undefined);
    mockCreatePlayerAndAddToMatch.mockResolvedValue(undefined);
    mockDeleteMatch.mockResolvedValue(undefined);
    mockCreateMatch.mockResolvedValue({ publicCode: "NEW111" });
  });

  it("starts from club and speeldag, and defaults to all matches", async () => {
    render(<AssignmentBoard />);

    fireEvent.change(screen.getByDisplayValue("Huidige speelweek"), {
      target: { value: "alles" },
    });
    fireEvent.click(screen.getByRole("button", { name: /vv DIA/ }));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(matchDayOneLabel) }));

    expect(screen.getByText("JO11-1 vs SCO")).toBeInTheDocument();
    expect(screen.getByText("JO11-1 @ Gilze")).toBeInTheDocument();
    expect(screen.queryByText("JO13-1 vs TSC")).not.toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue("Alle wedstrijden"), {
      target: { value: "thuis" },
    });

    expect(screen.queryByText("JO11-1 @ Gilze")).not.toBeInTheDocument();
  });

  it("filters by club, speeldag and search term, then opens the side panel", async () => {
    render(<AssignmentBoard />);

    fireEvent.change(screen.getByDisplayValue("Huidige speelweek"), {
      target: { value: "alles" },
    });
    fireEvent.click(screen.getByRole("button", { name: /vv DIA/ }));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(matchDayTwoLabel) }));
    fireEvent.change(screen.getByPlaceholderText(/Zoek op club/i), {
      target: { value: "Baronie" },
    });

    fireEvent.click(screen.getByText("JO12-1 vs Baronie"));

    expect(await screen.findByText("Wedstrijdpaneel")).toBeInTheDocument();
    expect(screen.getByText("Toewijzing")).toBeInTheDocument();
  });

  it("saves a new referee assignment and can reset pending field changes", async () => {
    render(<AssignmentBoard />);

    fireEvent.change(screen.getByDisplayValue("Huidige speelweek"), {
      target: { value: "alles" },
    });
    fireEvent.click(screen.getByRole("button", { name: /vv DIA/ }));
    fireEvent.click(screen.getByRole("button", { name: new RegExp(matchDayTwoLabel) }));
    fireEvent.click(screen.getByText("JO12-1 vs Baronie"));

    const opponentInput = await screen.findByDisplayValue("Baronie");
    fireEvent.change(opponentInput, { target: { value: "Baronie JO12-2" } });
    fireEvent.click(screen.getByText("Ref B"));
    fireEvent.click(screen.getByText("Opslaan"));

    await waitFor(() => {
      expect(mockUpdateMatch).toHaveBeenCalledWith(
        expect.objectContaining({
          matchId: "match-3",
          opponent: "Baronie JO12-2",
          refereeId: "ref-2",
        })
      );
    });

    fireEvent.change(screen.getByDisplayValue("Baronie JO12-2"), {
      target: { value: "Test wijziging" },
    });
    fireEvent.click(screen.getByText("Annuleren"));

    expect(screen.getByDisplayValue("Baronie")).toBeInTheDocument();
  });
});
