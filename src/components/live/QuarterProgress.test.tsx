import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuarterProgress } from './QuarterProgress';

describe('QuarterProgress', () => {
  describe('Quarter Labels (4 quarters)', () => {
    it('renders Q1-Q4 labels for 4 quarter format', () => {
      render(
        <QuarterProgress
          currentQuarter={1}
          quarterCount={4}
          status="live"
        />
      );
      expect(screen.getByText('Q1')).toBeInTheDocument();
      expect(screen.getByText('Q2')).toBeInTheDocument();
      expect(screen.getByText('Q3')).toBeInTheDocument();
      expect(screen.getByText('Q4')).toBeInTheDocument();
    });

    it('does not render H1/H2 for 4 quarter format', () => {
      render(
        <QuarterProgress
          currentQuarter={1}
          quarterCount={4}
          status="live"
        />
      );
      expect(screen.queryByText('H1')).not.toBeInTheDocument();
      expect(screen.queryByText('H2')).not.toBeInTheDocument();
    });
  });

  describe('Half Labels (2 halves)', () => {
    it('renders H1-H2 labels for 2 half format', () => {
      render(
        <QuarterProgress
          currentQuarter={1}
          quarterCount={2}
          status="live"
        />
      );
      expect(screen.getByText('H1')).toBeInTheDocument();
      expect(screen.getByText('H2')).toBeInTheDocument();
    });

    it('does not render Q1-Q4 for 2 half format', () => {
      render(
        <QuarterProgress
          currentQuarter={1}
          quarterCount={2}
          status="live"
        />
      );
      expect(screen.queryByText('Q1')).not.toBeInTheDocument();
      expect(screen.queryByText('Q4')).not.toBeInTheDocument();
    });
  });

  describe('Current Quarter Highlighting', () => {
    // Helper to get the circle element (the div containing the label text)
    const getCircle = (label: string) => {
      const labelElement = screen.getByText(label);
      // The circle is the parent div with the styling classes
      return labelElement.closest('.rounded-full');
    };

    it('highlights current quarter with ring when live', () => {
      render(
        <QuarterProgress
          currentQuarter={2}
          quarterCount={4}
          status="live"
        />
      );
      const q2Circle = getCircle('Q2');
      expect(q2Circle).toHaveClass('ring-2');
      expect(q2Circle).toHaveClass('text-green-600');
    });

    it('highlights current quarter with orange ring during halftime', () => {
      render(
        <QuarterProgress
          currentQuarter={2}
          quarterCount={4}
          status="halftime"
        />
      );
      const q2Circle = getCircle('Q2');
      expect(q2Circle).toHaveClass('ring-2');
      expect(q2Circle).toHaveClass('text-orange-600');
    });

    it('shows past quarters with reduced opacity', () => {
      render(
        <QuarterProgress
          currentQuarter={3}
          quarterCount={4}
          status="live"
        />
      );
      const q1Circle = getCircle('Q1');
      const q2Circle = getCircle('Q2');
      expect(q1Circle).toHaveClass('bg-white/30');
      expect(q2Circle).toHaveClass('bg-white/30');
    });

    it('shows future quarters with low opacity', () => {
      render(
        <QuarterProgress
          currentQuarter={2}
          quarterCount={4}
          status="live"
        />
      );
      const q3Circle = getCircle('Q3');
      const q4Circle = getCircle('Q4');
      expect(q3Circle).toHaveClass('bg-white/10', 'text-white/50');
      expect(q4Circle).toHaveClass('bg-white/10', 'text-white/50');
    });
  });

  describe('Status States', () => {
    // Helper to get the circle element
    const getCircle = (label: string) => {
      const labelElement = screen.getByText(label);
      return labelElement.closest('.rounded-full');
    };

    it('shows all quarters with low opacity when scheduled', () => {
      render(
        <QuarterProgress
          currentQuarter={1}
          quarterCount={4}
          status="scheduled"
        />
      );
      const q1Circle = getCircle('Q1');
      expect(q1Circle).toHaveClass('bg-white/10', 'text-white/50');
    });

    it('shows all quarters with low opacity when lineup', () => {
      render(
        <QuarterProgress
          currentQuarter={1}
          quarterCount={4}
          status="lineup"
        />
      );
      const q1Circle = getCircle('Q1');
      expect(q1Circle).toHaveClass('bg-white/10', 'text-white/50');
    });

    it('shows all quarters as completed when finished', () => {
      render(
        <QuarterProgress
          currentQuarter={4}
          quarterCount={4}
          status="finished"
        />
      );
      const q1Circle = getCircle('Q1');
      const q4Circle = getCircle('Q4');
      // All should be "past" style when finished
      expect(q1Circle).toHaveClass('bg-white/30');
      expect(q4Circle).toHaveClass('bg-white/30');
    });
  });

  describe('Connector Lines', () => {
    it('renders connector lines between quarters', () => {
      const { container } = render(
        <QuarterProgress
          currentQuarter={1}
          quarterCount={4}
          status="live"
        />
      );
      // Should have 3 connector lines for 4 quarters
      const connectors = container.querySelectorAll('.w-4.h-0\\.5');
      expect(connectors.length).toBe(3);
    });

    it('renders 1 connector line for 2 halves', () => {
      const { container } = render(
        <QuarterProgress
          currentQuarter={1}
          quarterCount={2}
          status="live"
        />
      );
      const connectors = container.querySelectorAll('.w-4.h-0\\.5');
      expect(connectors.length).toBe(1);
    });
  });

  describe('Quarter Circle Sizing', () => {
    it('quarter circles have correct dimensions', () => {
      render(
        <QuarterProgress
          currentQuarter={1}
          quarterCount={4}
          status="live"
        />
      );
      const labelElement = screen.getByText('Q1');
      const circle = labelElement.closest('.rounded-full');
      expect(circle).toHaveClass('w-10', 'h-10', 'rounded-full');
    });
  });

  describe('Custom className', () => {
    it('merges custom className', () => {
      const { container } = render(
        <QuarterProgress
          currentQuarter={1}
          quarterCount={4}
          status="live"
          className="my-custom-class"
        />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('my-custom-class');
      expect(wrapper).toHaveClass('flex', 'items-center', 'justify-center');
    });
  });

  describe('Layout', () => {
    it('renders with flex layout', () => {
      const { container } = render(
        <QuarterProgress
          currentQuarter={1}
          quarterCount={4}
          status="live"
        />
      );
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('flex', 'items-center', 'justify-center', 'gap-2');
    });
  });
});
