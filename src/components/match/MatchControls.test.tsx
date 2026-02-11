import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useMutation } from 'convex/react';
import { MatchControls } from './MatchControls';

const mockUseMutation = vi.mocked(useMutation);

describe('MatchControls', () => {
  const mockStartMatch = vi.fn();
  const mockNextQuarter = vi.fn();
  const mockResumeHalftime = vi.fn();
  const mockRemoveLastGoal = vi.fn();
  const mockOnGoalClick = vi.fn();
  const mockOnSubClick = vi.fn();
  const defaultMatchId = 'match123' as any;
  const defaultPin = '1234';

  beforeEach(() => {
    vi.clearAllMocks();
    // Map mutation references to their mocks by the string key from convex-api mock
    const mutationMap: Record<string, ReturnType<typeof vi.fn>> = {
      'matchActions:start': mockStartMatch,
      'matchActions:nextQuarter': mockNextQuarter,
      'matchActions:resumeFromHalftime': mockResumeHalftime,
      'matchActions:removeLastGoal': mockRemoveLastGoal,
    };
    (mockUseMutation as any).mockImplementation((ref: any) => {
      return mutationMap[ref as string] ?? vi.fn();
    });
    mockRemoveLastGoal.mockResolvedValue({ removedGoal: {} });
  });

  const defaultProps = {
    matchId: defaultMatchId,
    pin: defaultPin,
    status: 'live' as const,
    currentQuarter: 1,
    quarterCount: 4,
    homeScore: 0,
    awayScore: 0,
    onGoalClick: mockOnGoalClick,
    onSubClick: mockOnSubClick,
  };

  describe('Undo Goal Button — visibility', () => {
    it('does NOT show undo button when score is 0-0', () => {
      render(<MatchControls {...defaultProps} homeScore={0} awayScore={0} />);
      expect(screen.queryByText('Laatste doelpunt ongedaan maken')).not.toBeInTheDocument();
    });

    it('shows undo button when home team has scored', () => {
      render(<MatchControls {...defaultProps} homeScore={2} awayScore={0} />);
      expect(screen.getByText('Laatste doelpunt ongedaan maken')).toBeInTheDocument();
    });

    it('shows undo button when away team has scored', () => {
      render(<MatchControls {...defaultProps} homeScore={0} awayScore={1} />);
      expect(screen.getByText('Laatste doelpunt ongedaan maken')).toBeInTheDocument();
    });

    it('shows undo button when both teams have scored', () => {
      render(<MatchControls {...defaultProps} homeScore={3} awayScore={2} />);
      expect(screen.getByText('Laatste doelpunt ongedaan maken')).toBeInTheDocument();
    });
  });

  describe('Undo Goal Button — two-step confirmation', () => {
    it('shows confirm/cancel after first tap', () => {
      render(<MatchControls {...defaultProps} homeScore={1} awayScore={0} />);

      fireEvent.click(screen.getByText('Laatste doelpunt ongedaan maken'));

      expect(screen.getByText('Ja, verwijder')).toBeInTheDocument();
      expect(screen.getByText('Annuleren')).toBeInTheDocument();
    });

    it('cancels and returns to initial state on Annuleren', () => {
      render(<MatchControls {...defaultProps} homeScore={1} awayScore={0} />);

      fireEvent.click(screen.getByText('Laatste doelpunt ongedaan maken'));
      fireEvent.click(screen.getByText('Annuleren'));

      expect(screen.getByText('Laatste doelpunt ongedaan maken')).toBeInTheDocument();
      expect(screen.queryByText('Ja, verwijder')).not.toBeInTheDocument();
    });

    it('calls removeLastGoal on confirm', async () => {
      render(<MatchControls {...defaultProps} homeScore={1} awayScore={0} />);

      fireEvent.click(screen.getByText('Laatste doelpunt ongedaan maken'));
      fireEvent.click(screen.getByText('Ja, verwijder'));

      await waitFor(() => {
        expect(mockRemoveLastGoal).toHaveBeenCalledWith({
          matchId: defaultMatchId,
          pin: defaultPin,
        });
      });
    });
  });

  describe('Undo Goal Button — touch targets', () => {
    it('undo button has minimum 44px touch target', () => {
      render(<MatchControls {...defaultProps} homeScore={1} awayScore={0} />);
      const button = screen.getByText('Laatste doelpunt ongedaan maken');
      expect(button).toHaveClass('min-h-[44px]');
    });

    it('confirm button has minimum 44px touch target', () => {
      render(<MatchControls {...defaultProps} homeScore={1} awayScore={0} />);
      fireEvent.click(screen.getByText('Laatste doelpunt ongedaan maken'));
      expect(screen.getByText('Ja, verwijder')).toHaveClass('min-h-[44px]');
    });
  });

  describe('Live match controls', () => {
    it('shows GOAL and Wissel buttons during live match', () => {
      render(<MatchControls {...defaultProps} status="live" />);
      expect(screen.getByText('GOAL!')).toBeInTheDocument();
      expect(screen.getByText('Wissel')).toBeInTheDocument();
    });

    it('calls onGoalClick when GOAL button is clicked', () => {
      render(<MatchControls {...defaultProps} status="live" />);
      fireEvent.click(screen.getByText('GOAL!'));
      expect(mockOnGoalClick).toHaveBeenCalledTimes(1);
    });

    it('calls onSubClick when Wissel button is clicked', () => {
      render(<MatchControls {...defaultProps} status="live" />);
      fireEvent.click(screen.getByText('Wissel'));
      expect(mockOnSubClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('Quarter label — universal rest flow', () => {
    it('shows "Einde kwart 1" for quarter 1 of 4', () => {
      render(<MatchControls {...defaultProps} currentQuarter={1} quarterCount={4} />);
      expect(screen.getByText('Einde kwart 1')).toBeInTheDocument();
    });

    it('shows "Einde kwart 2" for quarter 2 of 4', () => {
      render(<MatchControls {...defaultProps} currentQuarter={2} quarterCount={4} />);
      expect(screen.getByText('Einde kwart 2')).toBeInTheDocument();
    });

    it('shows "Einde kwart 3" for quarter 3 of 4', () => {
      render(<MatchControls {...defaultProps} currentQuarter={3} quarterCount={4} />);
      expect(screen.getByText('Einde kwart 3')).toBeInTheDocument();
    });

    it('shows "Einde wedstrijd" for final quarter', () => {
      render(<MatchControls {...defaultProps} currentQuarter={4} quarterCount={4} />);
      expect(screen.getByText('Einde wedstrijd')).toBeInTheDocument();
    });

    it('shows "Einde helft 1" for half 1 of 2', () => {
      render(<MatchControls {...defaultProps} currentQuarter={1} quarterCount={2} />);
      expect(screen.getByText('Einde helft 1')).toBeInTheDocument();
    });

    it('shows "Einde wedstrijd" for half 2 of 2', () => {
      render(<MatchControls {...defaultProps} currentQuarter={2} quarterCount={2} />);
      expect(screen.getByText('Einde wedstrijd')).toBeInTheDocument();
    });
  });

  describe('Rest period — resume labels', () => {
    it('shows "Start kwart 2" during rest between Q1 and Q2', () => {
      render(<MatchControls {...defaultProps} status="halftime" currentQuarter={2} quarterCount={4} />);
      expect(screen.getByText('Start kwart 2')).toBeInTheDocument();
    });

    it('shows "Start kwart 3" during rest between Q2 and Q3', () => {
      render(<MatchControls {...defaultProps} status="halftime" currentQuarter={3} quarterCount={4} />);
      expect(screen.getByText('Start kwart 3')).toBeInTheDocument();
    });

    it('shows "Start kwart 4" during rest between Q3 and Q4', () => {
      render(<MatchControls {...defaultProps} status="halftime" currentQuarter={4} quarterCount={4} />);
      expect(screen.getByText('Start kwart 4')).toBeInTheDocument();
    });

    it('shows "Start helft 2" for halves format', () => {
      render(<MatchControls {...defaultProps} status="halftime" currentQuarter={2} quarterCount={2} />);
      expect(screen.getByText('Start helft 2')).toBeInTheDocument();
    });
  });
});
