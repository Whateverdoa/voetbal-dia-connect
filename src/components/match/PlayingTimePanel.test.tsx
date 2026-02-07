import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useQuery } from 'convex/react';
import { PlayingTimePanel } from './PlayingTimePanel';

// Type the mock
const mockUseQuery = vi.mocked(useQuery);

describe('PlayingTimePanel', () => {
  const defaultMatchId = 'match123' as any;
  const defaultPin = '1234';

  // Mock player data with varying playing times
  const mockPlayingTimeData = {
    players: [
      { playerId: 'p1' as any, matchPlayerId: 'mp1' as any, name: 'Jan', number: 10, minutesPlayed: 5, onField: false, isKeeper: false },
      { playerId: 'p2' as any, matchPlayerId: 'mp2' as any, name: 'Piet', number: 7, minutesPlayed: 12, onField: true, isKeeper: false },
      { playerId: 'p3' as any, matchPlayerId: 'mp3' as any, name: 'Klaas', number: 1, minutesPlayed: 15, onField: true, isKeeper: true },
      { playerId: 'p4' as any, matchPlayerId: 'mp4' as any, name: 'Dirk', number: 9, minutesPlayed: 8, onField: true, isKeeper: false },
      { playerId: 'p5' as any, matchPlayerId: 'mp5' as any, name: 'Henk', number: 11, minutesPlayed: 3, onField: false, isKeeper: false },
    ],
    status: 'live' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading spinner when data is undefined', () => {
      mockUseQuery.mockReturnValue(undefined);

      const { container } = render(
        <PlayingTimePanel matchId={defaultMatchId} pin={defaultPin} />
      );

      // Check for spinner animation
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows Dutch error message when data is null', () => {
      mockUseQuery.mockReturnValue(null);

      render(<PlayingTimePanel matchId={defaultMatchId} pin={defaultPin} />);

      expect(screen.getByText('Kon speeltijd niet laden')).toBeInTheDocument();
    });
  });

  describe('Dutch Labels', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue(mockPlayingTimeData);
    });

    it('renders "Speeltijd overzicht" header', () => {
      render(<PlayingTimePanel matchId={defaultMatchId} pin={defaultPin} />);
      expect(screen.getByText('Speeltijd overzicht')).toBeInTheDocument();
    });

    it('renders "Gemiddeld" label for average minutes', () => {
      render(<PlayingTimePanel matchId={defaultMatchId} pin={defaultPin} />);
      expect(screen.getByText('Gemiddeld')).toBeInTheDocument();
    });

    it('renders "Verschil" label for spread', () => {
      render(<PlayingTimePanel matchId={defaultMatchId} pin={defaultPin} />);
      expect(screen.getByText('Verschil')).toBeInTheDocument();
    });

    it('renders "Spelers" label for player count', () => {
      render(<PlayingTimePanel matchId={defaultMatchId} pin={defaultPin} />);
      expect(screen.getByText('Spelers')).toBeInTheDocument();
    });

    it('renders "Alle spelers (minst gespeeld eerst)" section', () => {
      render(<PlayingTimePanel matchId={defaultMatchId} pin={defaultPin} />);
      expect(screen.getByText('Alle spelers (minst gespeeld eerst)')).toBeInTheDocument();
    });

    it('renders "Op het veld" section header', () => {
      render(<PlayingTimePanel matchId={defaultMatchId} pin={defaultPin} />);
      expect(screen.getByText(/Op het veld/)).toBeInTheDocument();
    });

    it('renders "Bank" section header', () => {
      render(<PlayingTimePanel matchId={defaultMatchId} pin={defaultPin} />);
      expect(screen.getByText(/Bank/)).toBeInTheDocument();
    });

    it('renders fairness legend with Dutch labels', () => {
      render(<PlayingTimePanel matchId={defaultMatchId} pin={defaultPin} />);
      expect(screen.getByText('Goed')).toBeInTheDocument();
      expect(screen.getByText('Meer nodig')).toBeInTheDocument();
      expect(screen.getByText('Te weinig')).toBeInTheDocument();
    });
  });

  describe('Player List Sorting', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue(mockPlayingTimeData);
    });

    it('displays all player names', () => {
      render(<PlayingTimePanel matchId={defaultMatchId} pin={defaultPin} />);

      expect(screen.getAllByText('Jan').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Piet').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Klaas').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Dirk').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Henk').length).toBeGreaterThan(0);
    });

    it('displays player numbers', () => {
      render(<PlayingTimePanel matchId={defaultMatchId} pin={defaultPin} />);

      // Numbers appear multiple times (in sorted list and on-field/bench sections)
      expect(screen.getAllByText('10').length).toBeGreaterThan(0);
      expect(screen.getAllByText('7').length).toBeGreaterThan(0);
      expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    });

    it('displays minutes played with "min" suffix', () => {
      render(<PlayingTimePanel matchId={defaultMatchId} pin={defaultPin} />);

      // Check for various minute displays
      expect(screen.getAllByText('5 min').length).toBeGreaterThan(0);
      expect(screen.getAllByText('12 min').length).toBeGreaterThan(0);
      expect(screen.getAllByText('15 min').length).toBeGreaterThan(0);
    });
  });

  describe('Color Indicators (Fairness Status)', () => {
    it('shows green indicator for players with good playing time', () => {
      // Player with minutes close to average should be green
      const dataWithGoodTimes = {
        players: [
          { playerId: 'p1' as any, matchPlayerId: 'mp1' as any, name: 'Jan', number: 10, minutesPlayed: 10, onField: true, isKeeper: false },
          { playerId: 'p2' as any, matchPlayerId: 'mp2' as any, name: 'Piet', number: 7, minutesPlayed: 10, onField: true, isKeeper: false },
        ],
        status: 'live' as const,
      };
      mockUseQuery.mockReturnValue(dataWithGoodTimes);

      const { container } = render(
        <PlayingTimePanel matchId={defaultMatchId} pin={defaultPin} />
      );

      // Check for green background classes
      const greenElements = container.querySelectorAll('.bg-green-100');
      expect(greenElements.length).toBeGreaterThan(0);
    });

    it('shows yellow indicator for players needing more time', () => {
      // Player 4-6 minutes below average should be yellow
      // Average = 16, so a player with 11 min is 5 below (yellow range: 3-6)
      const dataWithWarning = {
        players: [
          { playerId: 'p1' as any, matchPlayerId: 'mp1' as any, name: 'Jan', number: 10, minutesPlayed: 20, onField: true, isKeeper: false },
          { playerId: 'p2' as any, matchPlayerId: 'mp2' as any, name: 'Piet', number: 7, minutesPlayed: 12, onField: false, isKeeper: false }, // 4 min below avg of 16
        ],
        status: 'live' as const,
      };
      mockUseQuery.mockReturnValue(dataWithWarning);

      const { container } = render(
        <PlayingTimePanel matchId={defaultMatchId} pin={defaultPin} />
      );

      // Check for yellow background classes
      const yellowElements = container.querySelectorAll('.bg-yellow-50');
      expect(yellowElements.length).toBeGreaterThan(0);
    });

    it('shows red indicator for players with critical low time', () => {
      // Player >6 minutes below average should be red
      const dataWithCritical = {
        players: [
          { playerId: 'p1' as any, matchPlayerId: 'mp1' as any, name: 'Jan', number: 10, minutesPlayed: 20, onField: true, isKeeper: false },
          { playerId: 'p2' as any, matchPlayerId: 'mp2' as any, name: 'Piet', number: 7, minutesPlayed: 5, onField: false, isKeeper: false }, // 7.5 min below avg of 12.5
        ],
        status: 'live' as const,
      };
      mockUseQuery.mockReturnValue(dataWithCritical);

      const { container } = render(
        <PlayingTimePanel matchId={defaultMatchId} pin={defaultPin} />
      );

      // Check for red background classes
      const redElements = container.querySelectorAll('.bg-red-50');
      expect(redElements.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics Display', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue(mockPlayingTimeData);
    });

    it('displays player count correctly', () => {
      render(<PlayingTimePanel matchId={defaultMatchId} pin={defaultPin} />);

      // 5 players in mock data - find within the Spelers section
      const spelersLabel = screen.getByText('Spelers');
      const spelersSection = spelersLabel.parentElement;
      expect(spelersSection).toHaveTextContent('5');
    });

    it('calculates and displays average minutes', () => {
      render(<PlayingTimePanel matchId={defaultMatchId} pin={defaultPin} />);

      // Average of 5+12+15+8+3 = 43/5 = 8.6, rounded to 9
      const gemiddeldLabel = screen.getByText('Gemiddeld');
      const gemiddeldSection = gemiddeldLabel.parentElement;
      expect(gemiddeldSection).toHaveTextContent('9 min');
    });

    it('calculates and displays spread (max - min)', () => {
      // Use specific mock data with known spread
      const spreadTestData = {
        players: [
          { playerId: 'p1' as any, matchPlayerId: 'mp1' as any, name: 'Jan', number: 10, minutesPlayed: 10, onField: true, isKeeper: false },
          { playerId: 'p2' as any, matchPlayerId: 'mp2' as any, name: 'Piet', number: 7, minutesPlayed: 5, onField: false, isKeeper: false },
        ],
        status: 'live' as const,
      };
      mockUseQuery.mockReturnValue(spreadTestData);

      render(<PlayingTimePanel matchId={defaultMatchId} pin={defaultPin} />);

      // Spread = max(10) - min(5) = 5
      const verschilLabel = screen.getByText('Verschil');
      const verschilSection = verschilLabel.parentElement;
      expect(verschilSection).toHaveTextContent('5 min');
    });
  });

  describe('On-Field vs Bench Sections', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue(mockPlayingTimeData);
    });

    it('shows correct count of on-field players', () => {
      render(<PlayingTimePanel matchId={defaultMatchId} pin={defaultPin} />);

      // 3 players on field in mock data
      expect(screen.getByText(/Op het veld \(3\)/)).toBeInTheDocument();
    });

    it('shows correct count of bench players', () => {
      render(<PlayingTimePanel matchId={defaultMatchId} pin={defaultPin} />);

      // 2 players on bench in mock data
      expect(screen.getByText(/Bank \(2\)/)).toBeInTheDocument();
    });
  });

  describe('Keeper Indicator', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue(mockPlayingTimeData);
    });

    it('shows "K" badge for goalkeeper', () => {
      render(<PlayingTimePanel matchId={defaultMatchId} pin={defaultPin} />);

      // Klaas is the keeper
      const keeperBadges = screen.getAllByText('K');
      expect(keeperBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Field Status Indicator', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue(mockPlayingTimeData);
    });

    it('shows "Veld" badge for on-field players in full view', () => {
      render(<PlayingTimePanel matchId={defaultMatchId} pin={defaultPin} />);

      // Players on field should have "Veld" badge in the sorted list
      const veldBadges = screen.getAllByText('Veld');
      expect(veldBadges.length).toBeGreaterThan(0);
    });
  });

  describe('Empty States', () => {
    it('shows Dutch message when no players on field', () => {
      const dataNoFieldPlayers = {
        players: [
          { playerId: 'p1' as any, matchPlayerId: 'mp1' as any, name: 'Jan', number: 10, minutesPlayed: 5, onField: false, isKeeper: false },
        ],
        status: 'live' as const,
      };
      mockUseQuery.mockReturnValue(dataNoFieldPlayers);

      render(<PlayingTimePanel matchId={defaultMatchId} pin={defaultPin} />);

      expect(screen.getByText('Geen spelers op het veld')).toBeInTheDocument();
    });

    it('shows Dutch message when no players on bench', () => {
      const dataNoBenchPlayers = {
        players: [
          { playerId: 'p1' as any, matchPlayerId: 'mp1' as any, name: 'Jan', number: 10, minutesPlayed: 5, onField: true, isKeeper: false },
        ],
        status: 'live' as const,
      };
      mockUseQuery.mockReturnValue(dataNoBenchPlayers);

      render(<PlayingTimePanel matchId={defaultMatchId} pin={defaultPin} />);

      expect(screen.getByText('Geen spelers op de bank')).toBeInTheDocument();
    });
  });

  describe('Progress Bar', () => {
    it('renders progress bars for players in full view', () => {
      mockUseQuery.mockReturnValue(mockPlayingTimeData);

      const { container } = render(
        <PlayingTimePanel matchId={defaultMatchId} pin={defaultPin} />
      );

      // Progress bars should have transition animation class
      const progressBars = container.querySelectorAll('.transition-all.duration-500');
      expect(progressBars.length).toBeGreaterThan(0);
    });
  });

  describe('Early Match State', () => {
    it('shows all players as "good" when match just started', () => {
      // When max minutes < 2, everyone should be "good"
      const earlyMatchData = {
        players: [
          { playerId: 'p1' as any, matchPlayerId: 'mp1' as any, name: 'Jan', number: 10, minutesPlayed: 1, onField: true, isKeeper: false },
          { playerId: 'p2' as any, matchPlayerId: 'mp2' as any, name: 'Piet', number: 7, minutesPlayed: 0, onField: false, isKeeper: false },
        ],
        status: 'live' as const,
      };
      mockUseQuery.mockReturnValue(earlyMatchData);

      const { container } = render(
        <PlayingTimePanel matchId={defaultMatchId} pin={defaultPin} />
      );

      // All players should have green styling (no yellow or red)
      const yellowElements = container.querySelectorAll('.bg-yellow-50');
      const redElements = container.querySelectorAll('.bg-red-50');
      expect(yellowElements.length).toBe(0);
      expect(redElements.length).toBe(0);
    });
  });
});
