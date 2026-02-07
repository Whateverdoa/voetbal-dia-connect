import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useQuery, useMutation } from 'convex/react';
import { SubstitutionSuggestions } from './SubstitutionSuggestions';

// Type the mocks
const mockUseQuery = vi.mocked(useQuery);
const mockUseMutation = vi.mocked(useMutation);

describe('SubstitutionSuggestions', () => {
  const defaultMatchId = 'match123' as any;
  const defaultPin = '1234';
  const mockSubstitute = vi.fn();

  // Mock suggestion data
  const mockSuggestionsData = {
    suggestions: [
      {
        playerOut: {
          playerId: 'p1' as any,
          name: 'Jan',
          number: 10,
          minutesPlayed: 18,
          onField: true,
          isKeeper: false,
        },
        playerIn: {
          playerId: 'p2' as any,
          name: 'Piet',
          number: 11,
          minutesPlayed: 5,
          onField: false,
          isKeeper: false,
        },
        timeDifference: 13,
        reason: 'Jan heeft veel meer gespeeld dan Piet',
      },
      {
        playerOut: {
          playerId: 'p3' as any,
          name: 'Klaas',
          number: 7,
          minutesPlayed: 15,
          onField: true,
          isKeeper: false,
        },
        playerIn: {
          playerId: 'p4' as any,
          name: 'Dirk',
          number: 12,
          minutesPlayed: 8,
          onField: false,
          isKeeper: false,
        },
        timeDifference: 7,
        reason: 'Klaas heeft meer gespeeld dan Dirk',
      },
    ],
    onFieldCount: 6,
    benchCount: 4,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseMutation.mockReturnValue(mockSubstitute);
    mockSubstitute.mockResolvedValue(undefined);
  });

  describe('Loading State', () => {
    it('shows loading spinner when data is undefined', () => {
      mockUseQuery.mockReturnValue(undefined);

      const { container } = render(
        <SubstitutionSuggestions matchId={defaultMatchId} pin={defaultPin} />
      );

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('shows Dutch error message when data is null', () => {
      mockUseQuery.mockReturnValue(null);

      render(<SubstitutionSuggestions matchId={defaultMatchId} pin={defaultPin} />);

      expect(screen.getByText('Kon suggesties niet laden')).toBeInTheDocument();
    });
  });

  describe('Dutch Labels', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue(mockSuggestionsData);
    });

    it('renders "Wissel suggesties" header', () => {
      render(<SubstitutionSuggestions matchId={defaultMatchId} pin={defaultPin} />);
      expect(screen.getByText('Wissel suggesties')).toBeInTheDocument();
    });

    it('renders "Wissel uitvoeren" button text', () => {
      render(<SubstitutionSuggestions matchId={defaultMatchId} pin={defaultPin} />);
      
      const executeButtons = screen.getAllByText('Wissel uitvoeren');
      expect(executeButtons.length).toBeGreaterThan(0);
    });

    it('renders footer text about equal playing time', () => {
      render(<SubstitutionSuggestions matchId={defaultMatchId} pin={defaultPin} />);
      expect(screen.getByText('Suggesties gebaseerd op gelijke speeltijd')).toBeInTheDocument();
    });

    it('shows field and bench counts in Dutch', () => {
      render(<SubstitutionSuggestions matchId={defaultMatchId} pin={defaultPin} />);
      expect(screen.getByText('6 op veld, 4 op bank')).toBeInTheDocument();
    });
  });

  describe('Suggestion Display', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue(mockSuggestionsData);
    });

    it('displays player out name', () => {
      render(<SubstitutionSuggestions matchId={defaultMatchId} pin={defaultPin} />);
      expect(screen.getByText('Jan')).toBeInTheDocument();
      expect(screen.getByText('Klaas')).toBeInTheDocument();
    });

    it('displays player in name', () => {
      render(<SubstitutionSuggestions matchId={defaultMatchId} pin={defaultPin} />);
      expect(screen.getByText('Piet')).toBeInTheDocument();
      expect(screen.getByText('Dirk')).toBeInTheDocument();
    });

    it('displays player numbers', () => {
      render(<SubstitutionSuggestions matchId={defaultMatchId} pin={defaultPin} />);
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('11')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('displays minutes played for each player', () => {
      render(<SubstitutionSuggestions matchId={defaultMatchId} pin={defaultPin} />);
      expect(screen.getByText('18 min')).toBeInTheDocument();
      expect(screen.getByText('5 min')).toBeInTheDocument();
      expect(screen.getByText('15 min')).toBeInTheDocument();
      expect(screen.getByText('8 min')).toBeInTheDocument();
    });

    it('displays Dutch reason text', () => {
      render(<SubstitutionSuggestions matchId={defaultMatchId} pin={defaultPin} />);
      expect(screen.getByText('Jan heeft veel meer gespeeld dan Piet')).toBeInTheDocument();
      expect(screen.getByText('Klaas heeft meer gespeeld dan Dirk')).toBeInTheDocument();
    });

    it('displays priority badges (1, 2)', () => {
      render(<SubstitutionSuggestions matchId={defaultMatchId} pin={defaultPin} />);
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('shows arrow between player out and player in', () => {
      render(<SubstitutionSuggestions matchId={defaultMatchId} pin={defaultPin} />);
      
      const arrows = screen.getAllByText('→');
      expect(arrows.length).toBeGreaterThan(0);
    });
  });

  describe('Urgency Styling', () => {
    it('shows high urgency (red) styling for large time difference', () => {
      // First suggestion has timeDifference > 8
      mockUseQuery.mockReturnValue(mockSuggestionsData);

      const { container } = render(
        <SubstitutionSuggestions matchId={defaultMatchId} pin={defaultPin} />
      );

      // High urgency should have red border
      const redBorderElements = container.querySelectorAll('.border-red-300');
      expect(redBorderElements.length).toBeGreaterThan(0);
    });

    it('shows medium urgency (yellow) styling for moderate time difference', () => {
      // Second suggestion has timeDifference between 5-8
      mockUseQuery.mockReturnValue(mockSuggestionsData);

      const { container } = render(
        <SubstitutionSuggestions matchId={defaultMatchId} pin={defaultPin} />
      );

      // Medium urgency should have yellow border
      const yellowBorderElements = container.querySelectorAll('.border-yellow-300');
      expect(yellowBorderElements.length).toBeGreaterThan(0);
    });

    it('shows low urgency (blue) styling for small time difference', () => {
      const lowUrgencyData = {
        ...mockSuggestionsData,
        suggestions: [{
          ...mockSuggestionsData.suggestions[0],
          timeDifference: 4,
        }],
      };
      mockUseQuery.mockReturnValue(lowUrgencyData);

      const { container } = render(
        <SubstitutionSuggestions matchId={defaultMatchId} pin={defaultPin} />
      );

      // Low urgency should have blue border
      const blueBorderElements = container.querySelectorAll('.border-blue-300');
      expect(blueBorderElements.length).toBeGreaterThan(0);
    });
  });

  describe('Empty State', () => {
    it('shows "Geen suggesties nodig" when no suggestions', () => {
      const emptyData = {
        suggestions: [],
        onFieldCount: 6,
        benchCount: 4,
      };
      mockUseQuery.mockReturnValue(emptyData);

      render(<SubstitutionSuggestions matchId={defaultMatchId} pin={defaultPin} />);

      expect(screen.getByText('Geen suggesties nodig')).toBeInTheDocument();
    });

    it('shows "Speeltijd is redelijk verdeeld" when no suggestions and bench has players', () => {
      const emptyData = {
        suggestions: [],
        onFieldCount: 6,
        benchCount: 4,
      };
      mockUseQuery.mockReturnValue(emptyData);

      render(<SubstitutionSuggestions matchId={defaultMatchId} pin={defaultPin} />);

      expect(screen.getByText('Speeltijd is redelijk verdeeld')).toBeInTheDocument();
    });

    it('shows "Geen spelers op de bank" when bench is empty', () => {
      const noBenchData = {
        suggestions: [],
        onFieldCount: 6,
        benchCount: 0,
      };
      mockUseQuery.mockReturnValue(noBenchData);

      render(<SubstitutionSuggestions matchId={defaultMatchId} pin={defaultPin} />);

      expect(screen.getByText('Geen spelers op de bank')).toBeInTheDocument();
    });

    it('shows checkmark icon when no suggestions needed', () => {
      const emptyData = {
        suggestions: [],
        onFieldCount: 6,
        benchCount: 4,
      };
      mockUseQuery.mockReturnValue(emptyData);

      render(<SubstitutionSuggestions matchId={defaultMatchId} pin={defaultPin} />);

      expect(screen.getByText('✓')).toBeInTheDocument();
    });
  });

  describe('One-Tap Execution', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue(mockSuggestionsData);
    });

    it('calls substitute mutation with correct parameters on button click', async () => {
      render(<SubstitutionSuggestions matchId={defaultMatchId} pin={defaultPin} />);

      const executeButtons = screen.getAllByText('Wissel uitvoeren');
      fireEvent.click(executeButtons[0]);

      await waitFor(() => {
        expect(mockSubstitute).toHaveBeenCalledWith({
          matchId: defaultMatchId,
          pin: defaultPin,
          playerOutId: 'p1',
          playerInId: 'p2',
        });
      });
    });

    it('shows "Bezig..." while executing substitution', async () => {
      mockSubstitute.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      render(<SubstitutionSuggestions matchId={defaultMatchId} pin={defaultPin} />);

      const executeButtons = screen.getAllByText('Wissel uitvoeren');
      fireEvent.click(executeButtons[0]);

      expect(screen.getByText('Bezig...')).toBeInTheDocument();
    });

    it('disables button while executing', async () => {
      mockSubstitute.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      render(<SubstitutionSuggestions matchId={defaultMatchId} pin={defaultPin} />);

      const executeButtons = screen.getAllByText('Wissel uitvoeren');
      fireEvent.click(executeButtons[0]);

      const busyButton = screen.getByText('Bezig...').closest('button');
      expect(busyButton).toBeDisabled();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue(mockSuggestionsData);
    });

    it('shows Dutch error message on failure', async () => {
      mockSubstitute.mockRejectedValue(new Error('Network error'));

      render(<SubstitutionSuggestions matchId={defaultMatchId} pin={defaultPin} />);

      const executeButtons = screen.getAllByText('Wissel uitvoeren');
      fireEvent.click(executeButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/Wissel mislukt/)).toBeInTheDocument();
      });
    });

    it('shows session expired message for PIN error', async () => {
      mockSubstitute.mockRejectedValue(new Error('Invalid match or PIN'));

      render(<SubstitutionSuggestions matchId={defaultMatchId} pin={defaultPin} />);

      const executeButtons = screen.getAllByText('Wissel uitvoeren');
      fireEvent.click(executeButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Sessie verlopen. Herlaad de pagina.')).toBeInTheDocument();
      });
    });
  });

  describe('Visual Elements', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue(mockSuggestionsData);
    });

    it('shows down arrow for player out', () => {
      render(<SubstitutionSuggestions matchId={defaultMatchId} pin={defaultPin} />);
      
      const downArrows = screen.getAllByText('↓');
      expect(downArrows.length).toBeGreaterThan(0);
    });

    it('shows up arrow for player in', () => {
      render(<SubstitutionSuggestions matchId={defaultMatchId} pin={defaultPin} />);
      
      const upArrows = screen.getAllByText('↑');
      expect(upArrows.length).toBeGreaterThan(0);
    });

    it('shows swap emoji in execute button', () => {
      render(<SubstitutionSuggestions matchId={defaultMatchId} pin={defaultPin} />);
      
      const swapEmojis = screen.getAllByText('🔄');
      expect(swapEmojis.length).toBeGreaterThan(0);
    });

    it('shows lightbulb emoji in header', () => {
      render(<SubstitutionSuggestions matchId={defaultMatchId} pin={defaultPin} />);
      expect(screen.getByText('💡')).toBeInTheDocument();
    });
  });

  describe('Player Out Styling', () => {
    beforeEach(() => {
      mockUseQuery.mockReturnValue(mockSuggestionsData);
    });

    it('shows red background for player out section', () => {
      const { container } = render(
        <SubstitutionSuggestions matchId={defaultMatchId} pin={defaultPin} />
      );

      const redBgElements = container.querySelectorAll('.bg-red-100');
      expect(redBgElements.length).toBeGreaterThan(0);
    });

    it('shows green background for player in section', () => {
      const { container } = render(
        <SubstitutionSuggestions matchId={defaultMatchId} pin={defaultPin} />
      );

      const greenBgElements = container.querySelectorAll('.bg-green-100');
      expect(greenBgElements.length).toBeGreaterThan(0);
    });
  });
});
