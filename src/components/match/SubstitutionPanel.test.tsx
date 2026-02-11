import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useMutation } from 'convex/react';
import { SubstitutionPanel } from './SubstitutionPanel';
import type { MatchPlayer } from './types';

// Type the mock
const mockUseMutation = vi.mocked(useMutation);

describe('SubstitutionPanel', () => {
  const mockOnClose = vi.fn();
  const mockSubstitute = vi.fn();
  const defaultMatchId = 'match123' as any;
  const defaultPin = '1234';

  const mockPlayersOnField: MatchPlayer[] = [
    { matchPlayerId: 'mp1' as any, playerId: 'p1' as any, name: 'Jan', number: 10, onField: true, isKeeper: false },
    { matchPlayerId: 'mp2' as any, playerId: 'p2' as any, name: 'Piet', number: 7, onField: true, isKeeper: false },
    { matchPlayerId: 'mp3' as any, playerId: 'p3' as any, name: 'Klaas', number: 9, onField: true, isKeeper: false },
    { matchPlayerId: 'mp4' as any, playerId: 'p4' as any, name: 'Dirk', number: 1, onField: true, isKeeper: true },
  ];

  const mockPlayersOnBench: MatchPlayer[] = [
    { matchPlayerId: 'mp5' as any, playerId: 'p5' as any, name: 'Henk', number: 11, onField: false, isKeeper: false },
    { matchPlayerId: 'mp6' as any, playerId: 'p6' as any, name: 'Willem', number: 12, onField: false, isKeeper: false },
    { matchPlayerId: 'mp7' as any, playerId: 'p7' as any, name: 'Bas', number: 13, onField: false, isKeeper: false },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (mockUseMutation as any).mockReturnValue(mockSubstitute);
    mockSubstitute.mockResolvedValue(undefined);
  });

  describe('Modal Structure', () => {
    it('renders modal with Dutch title "Wissel"', () => {
      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={mockPlayersOnBench}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText('Wissel')).toBeInTheDocument();
    });

    it('shows "Annuleren" cancel button', () => {
      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={mockPlayersOnBench}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText('Annuleren')).toBeInTheDocument();
    });

    it('calls onClose when cancel button is clicked', () => {
      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={mockPlayersOnBench}
          onClose={mockOnClose}
        />
      );
      fireEvent.click(screen.getByText('Annuleren'));
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('shows "Wissel bevestigen" submit button', () => {
      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={mockPlayersOnBench}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText('Wissel bevestigen')).toBeInTheDocument();
    });
  });

  describe('Player Out Selection (On Field)', () => {
    it('shows Dutch section header "Eruit (op het veld)"', () => {
      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={mockPlayersOnBench}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText('Eruit (op het veld)')).toBeInTheDocument();
    });

    it('displays all players on field', () => {
      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={mockPlayersOnBench}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText('Jan')).toBeInTheDocument();
      expect(screen.getByText('Piet')).toBeInTheDocument();
      expect(screen.getByText('Klaas')).toBeInTheDocument();
      expect(screen.getByText('Dirk')).toBeInTheDocument();
    });

    it('displays player numbers', () => {
      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={mockPlayersOnBench}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('7')).toBeInTheDocument();
      expect(screen.getByText('9')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('shows keeper indicator "K" for goalkeeper', () => {
      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={mockPlayersOnBench}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText('K')).toBeInTheDocument();
    });

    it('highlights selected player out', () => {
      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={mockPlayersOnBench}
          onClose={mockOnClose}
        />
      );

      // Get the player out section and click Jan
      const playerOutSection = screen.getByText('Eruit (op het veld)').parentElement;
      const janButton = playerOutSection?.querySelector('button');
      fireEvent.click(janButton!);

      // After click, Jan's button should have red border
      expect(janButton).toHaveClass('border-red-500');
    });

    it('players on field have green background by default', () => {
      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={mockPlayersOnBench}
          onClose={mockOnClose}
        />
      );

      const janButton = screen.getByText('Jan').closest('button');
      expect(janButton).toHaveClass('bg-green-50');
    });
  });

  describe('Player In Selection (Bench)', () => {
    it('shows Dutch section header "Erin (bank)"', () => {
      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={mockPlayersOnBench}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText('Erin (bank)')).toBeInTheDocument();
    });

    it('displays all players on bench', () => {
      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={mockPlayersOnBench}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText('Henk')).toBeInTheDocument();
      expect(screen.getByText('Willem')).toBeInTheDocument();
      expect(screen.getByText('Bas')).toBeInTheDocument();
    });

    it('displays bench player numbers', () => {
      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={mockPlayersOnBench}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText('11')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument();
      expect(screen.getByText('13')).toBeInTheDocument();
    });

    it('highlights selected player in', () => {
      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={mockPlayersOnBench}
          onClose={mockOnClose}
        />
      );

      // Get the player in section (bench) and click Henk
      const playerInSection = screen.getByText('Erin (bank)').parentElement;
      const buttons = playerInSection?.querySelectorAll('button');
      const henkButton = buttons?.[0]; // First bench player is Henk
      fireEvent.click(henkButton!);

      // After click, Henk's button should have green border
      expect(henkButton).toHaveClass('border-green-500');
    });

    it('shows empty state when no players on bench', () => {
      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={[]}
          onClose={mockOnClose}
        />
      );
      expect(screen.getByText('Geen spelers op de bank')).toBeInTheDocument();
    });
  });

  describe('Visual Summary', () => {
    it('shows placeholder text when no players selected', () => {
      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={mockPlayersOnBench}
          onClose={mockOnClose}
        />
      );

      // Initially no summary shown (only appears when at least one player selected)
      expect(screen.queryByText('Eruit?')).not.toBeInTheDocument();
    });

    it('shows "Eruit?" placeholder when only player out selected', () => {
      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={mockPlayersOnBench}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('Jan'));

      // Summary should show Jan's name and "Erin?" placeholder
      expect(screen.getByText('Erin?')).toBeInTheDocument();
    });

    it('shows both player names in summary when both selected', () => {
      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={mockPlayersOnBench}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('Jan')); // out
      fireEvent.click(screen.getByText('Henk')); // in

      // Summary should show both names
      const summarySection = screen.getByText('→').parentElement;
      expect(summarySection).toHaveTextContent('Jan');
      expect(summarySection).toHaveTextContent('Henk');
    });

    it('shows arrow between player out and player in', () => {
      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={mockPlayersOnBench}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('Jan'));

      expect(screen.getByText('→')).toBeInTheDocument();
    });
  });

  describe('Submit Button State', () => {
    it('disables submit button when no players selected', () => {
      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={mockPlayersOnBench}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Wissel bevestigen')).toBeDisabled();
    });

    it('disables submit button when only player out selected', () => {
      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={mockPlayersOnBench}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('Jan'));

      expect(screen.getByText('Wissel bevestigen')).toBeDisabled();
    });

    it('disables submit button when only player in selected', () => {
      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={mockPlayersOnBench}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('Henk'));

      expect(screen.getByText('Wissel bevestigen')).toBeDisabled();
    });

    it('enables submit button when both players selected', () => {
      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={mockPlayersOnBench}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('Jan')); // out
      fireEvent.click(screen.getByText('Henk')); // in

      expect(screen.getByText('Wissel bevestigen')).toBeEnabled();
    });
  });

  describe('Substitution Submission', () => {
    it('submits substitution with correct player IDs', async () => {
      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={mockPlayersOnBench}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('Jan')); // out (p1)
      fireEvent.click(screen.getByText('Henk')); // in (p5)
      fireEvent.click(screen.getByText('Wissel bevestigen'));

      await waitFor(() => {
        expect(mockSubstitute).toHaveBeenCalledWith({
          matchId: defaultMatchId,
          pin: defaultPin,
          playerOutId: 'p1',
          playerInId: 'p5',
        });
      });
    });

    it('calls onClose after successful substitution', async () => {
      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={mockPlayersOnBench}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('Jan'));
      fireEvent.click(screen.getByText('Henk'));
      fireEvent.click(screen.getByText('Wissel bevestigen'));

      await waitFor(() => {
        expect(mockOnClose).toHaveBeenCalled();
      });
    });

    it('shows "Bezig..." while submitting', async () => {
      mockSubstitute.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={mockPlayersOnBench}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('Jan'));
      fireEvent.click(screen.getByText('Henk'));
      fireEvent.click(screen.getByText('Wissel bevestigen'));

      expect(screen.getByText('Bezig...')).toBeInTheDocument();
    });

    it('disables submit button while submitting', async () => {
      mockSubstitute.mockImplementation(() => new Promise((resolve) => setTimeout(resolve, 100)));

      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={mockPlayersOnBench}
          onClose={mockOnClose}
        />
      );

      fireEvent.click(screen.getByText('Jan'));
      fireEvent.click(screen.getByText('Henk'));
      fireEvent.click(screen.getByText('Wissel bevestigen'));

      expect(screen.getByText('Bezig...')).toBeDisabled();
    });
  });

  describe('Player Selection Changes', () => {
    it('allows changing player out selection', () => {
      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={mockPlayersOnBench}
          onClose={mockOnClose}
        />
      );

      // Get the player out section
      const playerOutSection = screen.getByText('Eruit (op het veld)').parentElement;
      const buttons = playerOutSection?.querySelectorAll('button');
      const janButton = buttons?.[0]; // Jan
      const pietButton = buttons?.[1]; // Piet

      // Select Jan first
      fireEvent.click(janButton!);
      expect(janButton).toHaveClass('border-red-500');

      // Change to Piet
      fireEvent.click(pietButton!);
      expect(janButton).not.toHaveClass('border-red-500');
      expect(pietButton).toHaveClass('border-red-500');
    });

    it('allows changing player in selection', () => {
      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={mockPlayersOnBench}
          onClose={mockOnClose}
        />
      );

      // Get the player in section (bench)
      const playerInSection = screen.getByText('Erin (bank)').parentElement;
      const gridDiv = playerInSection?.querySelector('.grid');
      const buttons = gridDiv?.querySelectorAll('button');
      const henkButton = buttons?.[0]; // Henk
      const willemButton = buttons?.[1]; // Willem

      // Select Henk first
      fireEvent.click(henkButton!);
      expect(henkButton).toHaveClass('border-green-500');

      // Change to Willem
      fireEvent.click(willemButton!);
      expect(henkButton).not.toHaveClass('border-green-500');
      expect(willemButton).toHaveClass('border-green-500');
    });
  });

  describe('Touch Target Sizes', () => {
    it('player buttons have minimum touch target size', () => {
      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={mockPlayersOnBench}
          onClose={mockOnClose}
        />
      );

      const janButton = screen.getByText('Jan').closest('button');
      expect(janButton).toHaveClass('min-h-[56px]');

      const henkButton = screen.getByText('Henk').closest('button');
      expect(henkButton).toHaveClass('min-h-[56px]');
    });

    it('action buttons have minimum touch target size', () => {
      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={mockPlayersOnBench}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Annuleren')).toHaveClass('min-h-[48px]');
      expect(screen.getByText('Wissel bevestigen')).toHaveClass('min-h-[48px]');
    });
  });

  describe('Accessibility', () => {
    it('uses semantic heading for modal title', () => {
      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={mockPlayersOnBench}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('heading', { name: 'Wissel' })).toBeInTheDocument();
    });

    it('uses semantic headings for section titles', () => {
      render(
        <SubstitutionPanel
          matchId={defaultMatchId}
          pin={defaultPin}
          playersOnField={mockPlayersOnField}
          playersOnBench={mockPlayersOnBench}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByRole('heading', { name: /Eruit/ })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /Erin/ })).toBeInTheDocument();
    });
  });
});
