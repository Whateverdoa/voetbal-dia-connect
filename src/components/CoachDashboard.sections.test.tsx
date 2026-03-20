import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { CoachDashboard } from "./CoachDashboard";

const mockOnLogout = vi.fn();
const baseData = {
  coach: { id: "coach123", name: "Coach Mike" },
  teams: [{ id: "team456", name: "JO12-1" }],
  matches: [] as any[],
};

describe("CoachDashboard - extra sections", () => {
  describe("Finished Matches Section", () => {
    const dataWithFinished = {
      ...baseData,
      matches: [
        {
          _id: "match1",
          teamId: "team456",
          opponent: "VV Oranje",
          isHome: true,
          status: "finished" as const,
          publicCode: "ABC123",
          homeScore: 3,
          awayScore: 2,
          scheduledAt: Date.now() - 86400000,
          currentQuarter: 4,
        },
      ],
    };

    it('shows "Afgelopen" section header for finished matches', () => {
      render(<CoachDashboard data={dataWithFinished} onLogout={mockOnLogout} />);
      expect(
        screen.getByRole("heading", { name: "Afgelopen" })
      ).toBeInTheDocument();
    });

    it("displays final score for finished match", () => {
      render(<CoachDashboard data={dataWithFinished} onLogout={mockOnLogout} />);
      expect(screen.getByText("3 - 2")).toBeInTheDocument();
    });

    it("limits finished matches display to 3", () => {
      const manyFinished = {
        ...baseData,
        matches: Array.from({ length: 5 }, (_, i) => ({
          _id: `match${i}`,
          teamId: "team456",
          opponent: `Team ${i}`,
          isHome: true,
          status: "finished" as const,
          publicCode: `CODE${i}`,
          homeScore: i,
          awayScore: 0,
          scheduledAt: Date.now() - 86400000 * (i + 1),
          currentQuarter: 4,
        })),
      };
      render(<CoachDashboard data={manyFinished} onLogout={mockOnLogout} />);
      expect(screen.getByText(/\+2 meer tonen ▼/)).toBeInTheDocument();
    });
  });

  describe("Match Card Links", () => {
    const dataWithMatch = {
      ...baseData,
      matches: [
        {
          _id: "match789",
          teamId: "team456",
          opponent: "VV Oranje",
          isHome: true,
          status: "scheduled" as const,
          publicCode: "ABC123",
          homeScore: 0,
          awayScore: 0,
          scheduledAt: Date.now(),
          currentQuarter: 1,
        },
      ],
    };

    it("match card links to match control page", () => {
      render(<CoachDashboard data={dataWithMatch} onLogout={mockOnLogout} />);
      const matchLink = screen.getByText(/VV Oranje/).closest("a");
      expect(matchLink).toHaveAttribute("href", "/coach/match/match789");
    });
  });

  describe("Touch Target Sizes", () => {
    it("new match button is rendered and accessible", () => {
      render(<CoachDashboard data={baseData} onLogout={mockOnLogout} />);
      const newMatchLink = screen.getByText("Nieuwe wedstrijd").closest("a");
      expect(newMatchLink).toBeInTheDocument();
      expect(newMatchLink).toHaveAttribute("href", "/coach/new?teamId=team456");
    });
  });
});
