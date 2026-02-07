import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CoachDashboard } from './CoachDashboard';

describe('CoachDashboard', () => {
  const mockOnLogout = vi.fn();
  const defaultPin = '1234';

  const mockCoachData = {
    coach: { id: 'coach123', name: 'Coach Mike' },
    teams: [{ id: 'team456', name: 'JO12-1' }],
    matches: [] as any[],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Header', () => {
    it('renders Dutch welcome message with coach name', () => {
      render(
        <CoachDashboard data={mockCoachData} pin={defaultPin} onLogout={mockOnLogout} />
      );
      expect(screen.getByText('Welkom, Coach Mike!')).toBeInTheDocument();
    });

    it('displays team name in header', () => {
      render(
        <CoachDashboard data={mockCoachData} pin={defaultPin} onLogout={mockOnLogout} />
      );
      // Team name appears in header (p element) and as section heading (h2)
      const teamNames = screen.getAllByText('JO12-1');
      expect(teamNames.length).toBeGreaterThanOrEqual(1);
      // Check the header specifically contains the team name
      const header = screen.getByRole('banner');
      expect(header).toHaveTextContent('JO12-1');
    });

    it('displays multiple team names joined with bullet', () => {
      const multiTeamData = {
        ...mockCoachData,
        teams: [
          { id: 'team1', name: 'JO11-1' },
          { id: 'team2', name: 'JO13-2' },
        ],
      };
      render(
        <CoachDashboard data={multiTeamData} pin={defaultPin} onLogout={mockOnLogout} />
      );
      expect(screen.getByText('JO11-1 • JO13-2')).toBeInTheDocument();
    });

    it('renders logout button with Dutch text', () => {
      render(
        <CoachDashboard data={mockCoachData} pin={defaultPin} onLogout={mockOnLogout} />
      );
      expect(screen.getByLabelText('Uitloggen')).toBeInTheDocument();
      expect(screen.getByText('Uitloggen')).toBeInTheDocument();
    });

    it('calls onLogout when logout button is clicked', () => {
      render(
        <CoachDashboard data={mockCoachData} pin={defaultPin} onLogout={mockOnLogout} />
      );
      fireEvent.click(screen.getByLabelText('Uitloggen'));
      expect(mockOnLogout).toHaveBeenCalledTimes(1);
    });

    it('logout button has minimum touch target size', () => {
      render(
        <CoachDashboard data={mockCoachData} pin={defaultPin} onLogout={mockOnLogout} />
      );
      const logoutButton = screen.getByLabelText('Uitloggen');
      expect(logoutButton).toHaveClass('min-h-[44px]');
    });
  });

  describe('Team Sections', () => {
    it('renders team section with team name as heading', () => {
      render(
        <CoachDashboard data={mockCoachData} pin={defaultPin} onLogout={mockOnLogout} />
      );
      expect(screen.getByRole('heading', { name: 'JO12-1' })).toBeInTheDocument();
    });

    it('shows match count for team', () => {
      const dataWithMatches = {
        ...mockCoachData,
        matches: [
          { _id: 'm1', teamId: 'team456', status: 'scheduled', opponent: 'Test' },
          { _id: 'm2', teamId: 'team456', status: 'finished', opponent: 'Test2' },
        ],
      };
      render(
        <CoachDashboard data={dataWithMatches} pin={defaultPin} onLogout={mockOnLogout} />
      );
      expect(screen.getByText('2 wedstrijden')).toBeInTheDocument();
    });

    it('shows singular "wedstrijd" for single match', () => {
      const dataWithOneMatch = {
        ...mockCoachData,
        matches: [
          { _id: 'm1', teamId: 'team456', status: 'scheduled', opponent: 'Test' },
        ],
      };
      render(
        <CoachDashboard data={dataWithOneMatch} pin={defaultPin} onLogout={mockOnLogout} />
      );
      expect(screen.getByText('1 wedstrijd')).toBeInTheDocument();
    });

    it('renders "Nieuwe wedstrijd" button with Dutch text', () => {
      render(
        <CoachDashboard data={mockCoachData} pin={defaultPin} onLogout={mockOnLogout} />
      );
      expect(screen.getByText('Nieuwe wedstrijd')).toBeInTheDocument();
    });

    it('new match button links to correct URL with pin and teamId', () => {
      render(
        <CoachDashboard data={mockCoachData} pin={defaultPin} onLogout={mockOnLogout} />
      );
      const newMatchLink = screen.getByText('Nieuwe wedstrijd').closest('a');
      expect(newMatchLink).toHaveAttribute('href', '/coach/new?pin=1234&teamId=team456');
    });

    it('shows empty state message when no matches', () => {
      render(
        <CoachDashboard data={mockCoachData} pin={defaultPin} onLogout={mockOnLogout} />
      );
      expect(screen.getByText('Nog geen wedstrijden voor dit team')).toBeInTheDocument();
    });
  });

  describe('Scheduled Matches Section', () => {
    const dataWithScheduled = {
      ...mockCoachData,
      matches: [
        {
          _id: 'match1',
          teamId: 'team456',
          opponent: 'VV Oranje',
          isHome: true,
          status: 'scheduled',
          publicCode: 'ABC123',
          homeScore: 0,
          awayScore: 0,
          scheduledAt: Date.now() + 86400000,
          currentQuarter: 1,
        },
      ],
    };

    it('shows "Gepland" section header for scheduled matches', () => {
      render(
        <CoachDashboard data={dataWithScheduled} pin={defaultPin} onLogout={mockOnLogout} />
      );
      expect(screen.getByRole('heading', { name: 'Gepland' })).toBeInTheDocument();
    });

    it('displays opponent name with "vs" prefix for home matches', () => {
      render(
        <CoachDashboard data={dataWithScheduled} pin={defaultPin} onLogout={mockOnLogout} />
      );
      expect(screen.getByText(/vs VV Oranje/)).toBeInTheDocument();
    });

    it('displays opponent name with "@" prefix for away matches', () => {
      const awayMatchData = {
        ...mockCoachData,
        matches: [{ ...dataWithScheduled.matches[0], isHome: false }],
      };
      render(
        <CoachDashboard data={awayMatchData} pin={defaultPin} onLogout={mockOnLogout} />
      );
      expect(screen.getByText(/@ VV Oranje/)).toBeInTheDocument();
    });

    it('displays public code for match', () => {
      render(
        <CoachDashboard data={dataWithScheduled} pin={defaultPin} onLogout={mockOnLogout} />
      );
      expect(screen.getByText('ABC123')).toBeInTheDocument();
    });

    it('shows placeholder score for scheduled matches', () => {
      render(
        <CoachDashboard data={dataWithScheduled} pin={defaultPin} onLogout={mockOnLogout} />
      );
      expect(screen.getByText('- - -')).toBeInTheDocument();
    });
  });

  describe('Live Matches Section', () => {
    const dataWithLive = {
      ...mockCoachData,
      matches: [
        {
          _id: 'match1',
          teamId: 'team456',
          opponent: 'VV Oranje',
          isHome: true,
          status: 'live',
          publicCode: 'ABC123',
          homeScore: 2,
          awayScore: 1,
          scheduledAt: Date.now(),
          currentQuarter: 2,
        },
      ],
    };

    it('shows "Actieve wedstrijden" section for live matches', () => {
      render(
        <CoachDashboard data={dataWithLive} pin={defaultPin} onLogout={mockOnLogout} />
      );
      expect(screen.getByText('Actieve wedstrijden')).toBeInTheDocument();
    });

    it('displays current score for live match', () => {
      render(
        <CoachDashboard data={dataWithLive} pin={defaultPin} onLogout={mockOnLogout} />
      );
      expect(screen.getByText('2 - 1')).toBeInTheDocument();
    });

    it('displays current quarter indicator', () => {
      render(
        <CoachDashboard data={dataWithLive} pin={defaultPin} onLogout={mockOnLogout} />
      );
      expect(screen.getByText('K2')).toBeInTheDocument();
    });

    it('shows LIVE status badge', () => {
      render(
        <CoachDashboard data={dataWithLive} pin={defaultPin} onLogout={mockOnLogout} />
      );
      expect(screen.getByText('LIVE')).toBeInTheDocument();
    });

    it('includes halftime matches in active section', () => {
      const halftimeData = {
        ...mockCoachData,
        matches: [{ ...dataWithLive.matches[0], status: 'halftime' }],
      };
      render(
        <CoachDashboard data={halftimeData} pin={defaultPin} onLogout={mockOnLogout} />
      );
      expect(screen.getByText('Actieve wedstrijden')).toBeInTheDocument();
      expect(screen.getByText('Rust')).toBeInTheDocument();
    });

    it('includes lineup matches in active section', () => {
      const lineupData = {
        ...mockCoachData,
        matches: [{ ...dataWithLive.matches[0], status: 'lineup' }],
      };
      render(
        <CoachDashboard data={lineupData} pin={defaultPin} onLogout={mockOnLogout} />
      );
      expect(screen.getByText('Actieve wedstrijden')).toBeInTheDocument();
      expect(screen.getByText('Opstelling')).toBeInTheDocument();
    });
  });

  describe('Finished Matches Section', () => {
    const dataWithFinished = {
      ...mockCoachData,
      matches: [
        {
          _id: 'match1',
          teamId: 'team456',
          opponent: 'VV Oranje',
          isHome: true,
          status: 'finished',
          publicCode: 'ABC123',
          homeScore: 3,
          awayScore: 2,
          scheduledAt: Date.now() - 86400000,
          currentQuarter: 4,
        },
      ],
    };

    it('shows "Afgelopen" section header for finished matches', () => {
      render(
        <CoachDashboard data={dataWithFinished} pin={defaultPin} onLogout={mockOnLogout} />
      );
      expect(screen.getByRole('heading', { name: 'Afgelopen' })).toBeInTheDocument();
    });

    it('displays final score for finished match', () => {
      render(
        <CoachDashboard data={dataWithFinished} pin={defaultPin} onLogout={mockOnLogout} />
      );
      expect(screen.getByText('3 - 2')).toBeInTheDocument();
    });

    it('limits finished matches display to 3', () => {
      const manyFinished = {
        ...mockCoachData,
        matches: Array.from({ length: 5 }, (_, i) => ({
          _id: `match${i}`,
          teamId: 'team456',
          opponent: `Team ${i}`,
          isHome: true,
          status: 'finished',
          publicCode: `CODE${i}`,
          homeScore: i,
          awayScore: 0,
          scheduledAt: Date.now() - 86400000 * (i + 1),
          currentQuarter: 4,
        })),
      };
      render(
        <CoachDashboard data={manyFinished} pin={defaultPin} onLogout={mockOnLogout} />
      );
      // Should show "+2 meer" for the remaining matches
      expect(screen.getByText('+2 meer')).toBeInTheDocument();
    });
  });

  describe('Match Card Links', () => {
    const dataWithMatch = {
      ...mockCoachData,
      matches: [
        {
          _id: 'match789',
          teamId: 'team456',
          opponent: 'VV Oranje',
          isHome: true,
          status: 'scheduled',
          publicCode: 'ABC123',
          homeScore: 0,
          awayScore: 0,
          scheduledAt: Date.now(),
          currentQuarter: 1,
        },
      ],
    };

    it('match card links to match control page with pin', () => {
      render(
        <CoachDashboard data={dataWithMatch} pin={defaultPin} onLogout={mockOnLogout} />
      );
      const matchLink = screen.getByText(/VV Oranje/).closest('a');
      expect(matchLink).toHaveAttribute('href', '/coach/match/match789?pin=1234');
    });
  });

  describe('Touch Target Sizes', () => {
    it('new match button is rendered and accessible', () => {
      render(
        <CoachDashboard data={mockCoachData} pin={defaultPin} onLogout={mockOnLogout} />
      );
      const newMatchLink = screen.getByText('Nieuwe wedstrijd').closest('a');
      // The link should exist and be clickable
      expect(newMatchLink).toBeInTheDocument();
      expect(newMatchLink).toHaveAttribute('href', '/coach/new?pin=1234&teamId=team456');
    });
  });
});
