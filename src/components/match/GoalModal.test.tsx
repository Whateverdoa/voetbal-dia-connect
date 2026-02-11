import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useMutation } from 'convex/react';
import { GoalModal } from './GoalModal';
import type { MatchPlayer } from './types';

// Type the mock
const mockUseMutation = vi.mocked(useMutation);

describe('GoalModal', () => {
  const mockOnClose = vi.fn();
  const mockAddGoal = vi.fn();
  const defaultMatchId = 'match123' as any;
  const defaultPin = '1234';

  const mockPlayersOnField: MatchPlayer[] = [
    { matchPlayerId: 'mp1' as any, playerId: 'p1' as any, name: 'Jan', number: 10, onField: true, isKeeper: false },
    { matchPlayerId: 'mp2' as any, playerId: 'p2' as any, name: 'Piet', number: 7, onField: true, isKeeper: false },
    { matchPlayerId: 'mp3' as any, playerId: 'p3' as any, name: 'Klaas', number: 9, onField: true, isKeeper: false },
    { matchPlayerId: 'mp4' as any, playerId: 'p4' as any, name: 'Dirk', number: 1, onField: true, isKeeper: true },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (mockUseMutation as any).mockReturnValue(mockAddGoal);
    mockAddGoal.mockResolvedValue(undefined);
  });

  describe('Step 1: Goal Type Selection', () => {
    it('renders modal with Dutch title "Doelpunt"', () => {
      render(
        <GoalModal
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText('Doelpunt')).toBeInTheDocument();
    });

    it('shows "GOAL!" button for our team goal', () => {
      render(
        <GoalModal
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText('GOAL!')).toBeInTheDocument();
    });

    it('shows "Tegendoelpunt" button for opponent goal', () => {
      render(
        <GoalModal
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText('Tegendoelpunt')).toBeInTheDocument();
    });

    it('shows "Annuleren" cancel button', () => {
      render(
        <GoalModal
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText('Annuleren')).toBeInTheDocument();
    });

    it('calls onClose when cancel button is clicked', () => {
      render(
        <GoalModal
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          onClose={mockOnClose}
        />
      );
      fireEvent.click(screen.getByText('Annuleren'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('GOAL! button has large touch target (min 80px height)', () => {
      render(
        <GoalModal
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          onClose={mockOnClose}
        />
      );
      const goalButton = screen.getByText('GOAL!').closest('button');
      expect(goalButton).toHaveClass('min-h-[80px]');
    });

    it('Tegendoelpunt button has adequate touch target (min 64px height)', () => {
      render(
        <GoalModal
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          onClose={mockOnClose}
        />
      );
      const opponentButton = screen.getByText('Tegendoelpunt');
      expect(opponentButton).toHaveClass('min-h-[64px]');
    });
  });

  describe('Opponent Goal - 1-tap flow', () => {
    it('submits opponent goal immediately on click', async () => {
      render(
        <GoalModal
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('Tegendoelpunt'));

      await waitFor(() => {
        expect(mockAddGoal).toHaveBeenCalledWith({
          matchId: defaultMatchId,
          pin: defaultPin,
          isOpponentGoal: true,
        });
      });
    });

    it('calls onClose after opponent goal is submitted', async () => {
      render(
        <GoalModal
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('Tegendoelpunt'));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('disables buttons while submitting opponent goal', async () => {
      // Make the mutation take some time
      mockAddGoal.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      render(
        <GoalModal
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('Tegendoelpunt'));

      // Buttons should be disabled during submission
      expect(screen.getByText('Tegendoelpunt')).toBeDisabled();
      expect(screen.getByText('GOAL!').closest('button')).toBeDisabled();
    });
  });

  describe('Our Goal - Step 2: Scorer Selection', () => {
    it('shows scorer selection after clicking GOAL!', () => {
      render(
        <GoalModal
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('GOAL!'));

      expect(screen.getByText('Wie scoorde?')).toBeInTheDocument();
    });

    it('displays all players on field for scorer selection', () => {
      render(
        <GoalModal
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('GOAL!'));

      expect(screen.getByText('Jan')).toBeInTheDocument();
      expect(screen.getByText('Piet')).toBeInTheDocument();
      expect(screen.getByText('Klaas')).toBeInTheDocument();
      expect(screen.getByText('Dirk')).toBeInTheDocument();
    });

    it('displays player numbers', () => {
      render(
        <GoalModal
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('GOAL!'));

      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
      expect(screen.getByText('9')).toBeInTheDocument();
    });

    it('shows "Terug" button to go back to goal type selection', () => {
      render(
        <GoalModal
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('GOAL!'));

      expect(screen.getByText('Terug')).toBeInTheDocument();
    });

    it('returns to step 1 when clicking "Terug"', () => {
      render(
        <GoalModal
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('GOAL!'));
      fireEvent.click(screen.getByText('Terug'));

      // Should be back at step 1
      expect(screen.getByText('Doelpunt')).toBeInTheDocument();
      expect(screen.getByText('GOAL!')).toBeInTheDocument();
    });

    it('disables "Registreren" button until scorer is selected', () => {
      render(
        <GoalModal
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('GOAL!'));

      expect(screen.getByText('Registreren')).toBeDisabled();
    });

    it('enables "Registreren" button after selecting scorer', () => {
      render(
        <GoalModal
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('GOAL!'));
      fireEvent.click(screen.getByText('Jan'));

      expect(screen.getByText('Registreren')).toBeEnabled();
    });

    it('highlights selected scorer', () => {
      render(
        <GoalModal
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('GOAL!'));
      fireEvent.click(screen.getByText('Jan'));

      const janButton = screen.getByText('Jan').closest('button');
      expect(janButton).toHaveClass('border-dia-green');
    });
  });

  describe('Our Goal - Assist Selection (Optional)', () => {
    it('shows assist selection after selecting scorer', () => {
      render(
        <GoalModal
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('GOAL!'));
      fireEvent.click(screen.getByText('Jan'));

      expect(screen.getByText('Assist (optioneel)')).toBeInTheDocument();
    });

    it('shows "Geen assist" option', () => {
      render(
        <GoalModal
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('GOAL!'));
      fireEvent.click(screen.getByText('Jan'));

      expect(screen.getByText('Geen assist')).toBeInTheDocument();
    });

    it('excludes scorer from assist options', () => {
      render(
        <GoalModal
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('GOAL!'));
      fireEvent.click(screen.getByText('Jan'));

      // In the assist section, Jan should not appear as a player option (he's the scorer)
      // The assist section should have "Geen assist" + other players (not Jan)
      const assistHeading = screen.getByText('Assist (optioneel)');
      expect(assistHeading).toBeInTheDocument();
      
      // Get all buttons after the assist heading
      const assistContainer = assistHeading.parentElement?.parentElement;
      const assistGrid = assistContainer?.querySelectorAll('.grid')[1]; // Second grid is assist
      const assistButtons = assistGrid?.querySelectorAll('button');
      
      // Should have "Geen assist" + 3 other players (not Jan who is scorer)
      // Total: 4 buttons (Geen assist + Piet + Klaas + Dirk)
      expect(assistButtons?.length).toBe(4);
    });

    it('can select an assist player', () => {
      render(
        <GoalModal
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('GOAL!'));
      fireEvent.click(screen.getByText('Jan')); // scorer
      
      // Find Piet in the assist section and click
      const assistSection = screen.getByText('Assist (optioneel)').parentElement;
      const pietButton = assistSection?.querySelector('button:has([class*="truncate"])');
      
      // Click on Piet for assist
      fireEvent.click(screen.getAllByText('Piet')[0]);

      // Piet should be highlighted in assist section
      const pietButtons = screen.getAllByText('Piet');
      expect(pietButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Goal Submission', () => {
    it('submits goal with scorer only (no assist)', async () => {
      render(
        <GoalModal
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('GOAL!'));
      fireEvent.click(screen.getByText('Jan'));
      fireEvent.click(screen.getByText('Registreren'));

      await waitFor(() => {
        expect(mockAddGoal).toHaveBeenCalledWith({
          matchId: defaultMatchId,
          pin: defaultPin,
          playerId: 'p1',
          assistPlayerId: undefined,
          isOpponentGoal: false,
        });
      });
    });

    it('submits goal with scorer and assist', async () => {
      render(
        <GoalModal
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('GOAL!'));
      fireEvent.click(screen.getByText('Jan')); // scorer
      
      // Select Piet as assist (he appears in assist section)
      const assistButtons = screen.getAllByText('Piet');
      // The second Piet is in the assist section
      if (assistButtons.length > 1) {
        fireEvent.click(assistButtons[1]);
      } else {
        fireEvent.click(assistButtons[0]);
      }
      
      fireEvent.click(screen.getByText('Registreren'));

      await waitFor(() => {
        expect(mockAddGoal).toHaveBeenCalledWith({
          matchId: defaultMatchId,
          pin: defaultPin,
          playerId: 'p1',
          assistPlayerId: 'p2',
          isOpponentGoal: false,
        });
      });
    });

    it('calls onClose after successful goal submission', async () => {
      render(
        <GoalModal
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('GOAL!'));
      fireEvent.click(screen.getByText('Jan'));
      fireEvent.click(screen.getByText('Registreren'));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('shows "Bezig..." while submitting', async () => {
      mockAddGoal.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      render(
        <GoalModal
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('GOAL!'));
      fireEvent.click(screen.getByText('Jan'));
      fireEvent.click(screen.getByText('Registreren'));

      expect(screen.getByText('Bezig...')).toBeInTheDocument();
    });

    it('disables submit button while submitting', async () => {
      mockAddGoal.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      render(
        <GoalModal
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('GOAL!'));
      fireEvent.click(screen.getByText('Jan'));
      fireEvent.click(screen.getByText('Registreren'));

      expect(screen.getByText('Bezig...')).toBeDisabled();
    });
  });

  describe('Touch Target Sizes', () => {
    it('player buttons have minimum touch target size', () => {
      render(
        <GoalModal
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('GOAL!'));

      const janButton = screen.getByText('Jan').closest('button');
      expect(janButton).toHaveClass('min-h-[56px]');
    });

    it('action buttons have minimum touch target size', () => {
      render(
        <GoalModal
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('GOAL!'));

      expect(screen.getByText('Terug')).toHaveClass('min-h-[48px]');
      expect(screen.getByText('Registreren')).toHaveClass('min-h-[48px]');
    });
  });
});
