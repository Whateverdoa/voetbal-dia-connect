import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { GoalCelebration, ScoreWithAnimation } from './GoalCelebration';

describe('GoalCelebration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Visibility', () => {
    it('does not render when show is false', () => {
      const onComplete = vi.fn();
      const { container } = render(
        <GoalCelebration show={false} isOurGoal={true} onComplete={onComplete} />
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders when show is true', () => {
      const onComplete = vi.fn();
      render(
        <GoalCelebration show={true} isOurGoal={true} onComplete={onComplete} />
      );
      expect(screen.getByText('GOAL!')).toBeInTheDocument();
    });
  });

  describe('Our Goal Display', () => {
    it('shows "GOAL!" text for our goal', () => {
      const onComplete = vi.fn();
      render(
        <GoalCelebration show={true} isOurGoal={true} onComplete={onComplete} />
      );
      expect(screen.getByText('GOAL!')).toBeInTheDocument();
    });

    it('has green text color for our goal', () => {
      const onComplete = vi.fn();
      render(
        <GoalCelebration show={true} isOurGoal={true} onComplete={onComplete} />
      );
      const goalText = screen.getByText('GOAL!');
      expect(goalText).toHaveClass('text-green-500');
    });

    it('shows confetti effect for our goal', () => {
      const onComplete = vi.fn();
      const { container } = render(
        <GoalCelebration show={true} isOurGoal={true} onComplete={onComplete} />
      );
      // Confetti elements have animate-ping class
      const confetti = container.querySelectorAll('.animate-ping');
      expect(confetti.length).toBeGreaterThan(0);
    });

    it('shows football emoji', () => {
      const onComplete = vi.fn();
      render(
        <GoalCelebration show={true} isOurGoal={true} onComplete={onComplete} />
      );
      expect(screen.getByText('⚽')).toBeInTheDocument();
    });
  });

  describe('Opponent Goal Display', () => {
    it('shows "TEGEN" text for opponent goal', () => {
      const onComplete = vi.fn();
      render(
        <GoalCelebration show={true} isOurGoal={false} onComplete={onComplete} />
      );
      expect(screen.getByText('TEGEN')).toBeInTheDocument();
    });

    it('has red text color for opponent goal', () => {
      const onComplete = vi.fn();
      render(
        <GoalCelebration show={true} isOurGoal={false} onComplete={onComplete} />
      );
      const goalText = screen.getByText('TEGEN');
      expect(goalText).toHaveClass('text-red-500');
    });

    it('does not show confetti for opponent goal', () => {
      const onComplete = vi.fn();
      const { container } = render(
        <GoalCelebration show={true} isOurGoal={false} onComplete={onComplete} />
      );
      // No confetti container for opponent goals
      const confettiContainer = container.querySelector('.overflow-hidden');
      expect(confettiContainer).toBeNull();
    });
  });

  describe('Animation Timing', () => {
    it('calls onComplete after 2 seconds', async () => {
      const onComplete = vi.fn();
      render(
        <GoalCelebration show={true} isOurGoal={true} onComplete={onComplete} />
      );

      expect(onComplete).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('hides after 2 seconds', async () => {
      const onComplete = vi.fn();
      const { container } = render(
        <GoalCelebration show={true} isOurGoal={true} onComplete={onComplete} />
      );

      expect(screen.getByText('GOAL!')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(container.firstChild).toBeNull();
    });

    it('has bounce animation', () => {
      const onComplete = vi.fn();
      const { container } = render(
        <GoalCelebration show={true} isOurGoal={true} onComplete={onComplete} />
      );
      const animatedDiv = container.querySelector('.animate-bounce');
      expect(animatedDiv).toBeInTheDocument();
    });

    it('has pulse animation on text', () => {
      const onComplete = vi.fn();
      render(
        <GoalCelebration show={true} isOurGoal={true} onComplete={onComplete} />
      );
      const goalText = screen.getByText('GOAL!');
      expect(goalText).toHaveClass('animate-pulse');
    });
  });

  describe('Styling', () => {
    it('has fixed positioning for overlay', () => {
      const onComplete = vi.fn();
      const { container } = render(
        <GoalCelebration show={true} isOurGoal={true} onComplete={onComplete} />
      );
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass('fixed', 'inset-0', 'z-50');
    });

    it('is pointer-events-none to not block interactions', () => {
      const onComplete = vi.fn();
      const { container } = render(
        <GoalCelebration show={true} isOurGoal={true} onComplete={onComplete} />
      );
      const overlay = container.firstChild as HTMLElement;
      expect(overlay).toHaveClass('pointer-events-none');
    });

    it('has large text size', () => {
      const onComplete = vi.fn();
      render(
        <GoalCelebration show={true} isOurGoal={true} onComplete={onComplete} />
      );
      const goalText = screen.getByText('GOAL!');
      expect(goalText).toHaveClass('text-6xl', 'md:text-8xl');
    });
  });
});

describe('ScoreWithAnimation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Score Display', () => {
    it('renders home and away scores', () => {
      render(<ScoreWithAnimation homeScore={2} awayScore={1} />);
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('renders score separator', () => {
      render(<ScoreWithAnimation homeScore={2} awayScore={1} />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('renders zero scores', () => {
      render(<ScoreWithAnimation homeScore={0} awayScore={0} />);
      const zeros = screen.getAllByText('0');
      expect(zeros).toHaveLength(2);
    });
  });

  describe('Home Score Animation', () => {
    it('highlights home score when it increases', async () => {
      const { rerender } = render(
        <ScoreWithAnimation homeScore={1} awayScore={0} previousHomeScore={0} />
      );

      // The home score span should have highlight class
      const homeScore = screen.getByText('1');
      expect(homeScore).toHaveClass('scale-125', 'text-yellow-300');
    });

    it('removes highlight after 1.5 seconds', async () => {
      render(
        <ScoreWithAnimation homeScore={1} awayScore={0} previousHomeScore={0} />
      );

      const homeScore = screen.getByText('1');
      expect(homeScore).toHaveClass('scale-125');

      act(() => {
        vi.advanceTimersByTime(1500);
      });

      expect(homeScore).not.toHaveClass('scale-125');
    });

    it('does not highlight when score stays same', () => {
      render(
        <ScoreWithAnimation homeScore={1} awayScore={0} previousHomeScore={1} />
      );

      const homeScore = screen.getByText('1');
      expect(homeScore).not.toHaveClass('scale-125');
    });
  });

  describe('Away Score Animation', () => {
    it('highlights away score when it increases', () => {
      render(
        <ScoreWithAnimation homeScore={0} awayScore={1} previousAwayScore={0} />
      );

      const awayScore = screen.getByText('1');
      expect(awayScore).toHaveClass('scale-125', 'text-yellow-300');
    });

    it('removes highlight after 1.5 seconds', () => {
      render(
        <ScoreWithAnimation homeScore={0} awayScore={1} previousAwayScore={0} />
      );

      const awayScore = screen.getByText('1');
      expect(awayScore).toHaveClass('scale-125');

      act(() => {
        vi.advanceTimersByTime(1500);
      });

      expect(awayScore).not.toHaveClass('scale-125');
    });
  });

  describe('Styling', () => {
    it('has large font size', () => {
      const { container } = render(
        <ScoreWithAnimation homeScore={2} awayScore={1} />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('text-5xl', 'md:text-6xl');
    });

    it('has bold font weight', () => {
      const { container } = render(
        <ScoreWithAnimation homeScore={2} awayScore={1} />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('font-bold');
    });

    it('merges custom className', () => {
      const { container } = render(
        <ScoreWithAnimation homeScore={2} awayScore={1} className="my-custom-class" />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('my-custom-class');
      expect(wrapper).toHaveClass('font-bold'); // Still has default
    });

    it('separator has reduced opacity', () => {
      render(<ScoreWithAnimation homeScore={2} awayScore={1} />);
      const separator = screen.getByText('-');
      expect(separator).toHaveClass('opacity-50');
    });
  });

  describe('Without Previous Scores', () => {
    it('does not highlight when no previous scores provided', () => {
      render(<ScoreWithAnimation homeScore={2} awayScore={1} />);
      
      const homeScore = screen.getByText('2');
      const awayScore = screen.getByText('1');
      
      expect(homeScore).not.toHaveClass('scale-125');
      expect(awayScore).not.toHaveClass('scale-125');
    });
  });
});
