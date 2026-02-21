import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge, MatchStatus } from './StatusBadge';

describe('StatusBadge', () => {
  describe('Dutch Labels', () => {
    it('renders "Gepland" for scheduled status', () => {
      render(<StatusBadge status="scheduled" />);
      expect(screen.getByText('Gepland')).toBeInTheDocument();
    });

    it('renders "Opstelling" for lineup status', () => {
      render(<StatusBadge status="lineup" />);
      expect(screen.getByText('Opstelling')).toBeInTheDocument();
    });

    it('renders "LIVE" for live status', () => {
      render(<StatusBadge status="live" />);
      expect(screen.getByText('LIVE')).toBeInTheDocument();
    });

    it('renders "Rust" for halftime status', () => {
      render(<StatusBadge status="halftime" />);
      expect(screen.getByText('Rust')).toBeInTheDocument();
    });

    it('renders "Afgelopen" for finished status', () => {
      render(<StatusBadge status="finished" />);
      expect(screen.getByText('Afgelopen')).toBeInTheDocument();
    });
  });

  describe('Status Styling', () => {
    it('applies blue background for planned status', () => {
      render(<StatusBadge status="scheduled" />);
      const badge = screen.getByText('Gepland');
      expect(badge).toHaveClass('bg-blue-500');
    });

    it('applies blue background for lineup status', () => {
      render(<StatusBadge status="lineup" />);
      const badge = screen.getByText('Opstelling');
      expect(badge).toHaveClass('bg-blue-500');
    });

    it('applies green background and pulse animation for live status', () => {
      render(<StatusBadge status="live" />);
      const badge = screen.getByText('LIVE');
      expect(badge).toHaveClass('bg-green-500');
      expect(badge).toHaveClass('animate-pulse');
    });

    it('applies orange background for halftime status', () => {
      render(<StatusBadge status="halftime" />);
      const badge = screen.getByText('Rust');
      expect(badge).toHaveClass('bg-orange-500');
    });

    it('applies red background for finished status', () => {
      render(<StatusBadge status="finished" />);
      const badge = screen.getByText('Afgelopen');
      expect(badge).toHaveClass('bg-red-600');
    });
  });

  describe('Live Status Indicator', () => {
    it('shows pulsing dot only for live status', () => {
      const { container } = render(<StatusBadge status="live" />);
      // The live status has an extra pulsing dot element
      const pulsingDot = container.querySelector('.w-2.h-2.bg-white.rounded-full');
      expect(pulsingDot).toBeInTheDocument();
    });

    it('does not show pulsing dot for non-live statuses', () => {
      const statuses: MatchStatus[] = ['scheduled', 'lineup', 'halftime', 'finished'];
      
      statuses.forEach((status) => {
        const { container } = render(<StatusBadge status={status} />);
        const pulsingDot = container.querySelector('.w-2.h-2.bg-white.rounded-full');
        expect(pulsingDot).not.toBeInTheDocument();
      });
    });
  });

  describe('Size Variants', () => {
    it('applies small size classes by default', () => {
      render(<StatusBadge status="scheduled" />);
      const badge = screen.getByText('Gepland');
      expect(badge).toHaveClass('px-2', 'py-0.5', 'text-xs');
    });

    it('applies medium size classes when size="md"', () => {
      render(<StatusBadge status="scheduled" size="md" />);
      const badge = screen.getByText('Gepland');
      expect(badge).toHaveClass('px-3', 'py-1', 'text-sm');
    });

    it('applies large size classes when size="lg"', () => {
      render(<StatusBadge status="scheduled" size="lg" />);
      const badge = screen.getByText('Gepland');
      expect(badge).toHaveClass('px-4', 'py-1.5', 'text-base');
    });
  });

  describe('Custom className', () => {
    it('merges custom className with default classes', () => {
      render(<StatusBadge status="live" className="my-custom-class" />);
      const badge = screen.getByText('LIVE');
      expect(badge).toHaveClass('my-custom-class');
      expect(badge).toHaveClass('bg-green-500'); // Still has default class
    });
  });

  describe('Accessibility', () => {
    it('renders as a span element', () => {
      render(<StatusBadge status="scheduled" />);
      const badge = screen.getByText('Gepland');
      expect(badge.tagName).toBe('SPAN');
    });

    it('has uppercase text styling for visibility', () => {
      render(<StatusBadge status="scheduled" />);
      const badge = screen.getByText('Gepland');
      expect(badge).toHaveClass('uppercase');
    });
  });
});
