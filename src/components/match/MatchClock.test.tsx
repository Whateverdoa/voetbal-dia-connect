import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MatchClock, formatElapsed } from './MatchClock';

describe('formatElapsed', () => {
  it('formats 0ms as 00:00', () => {
    expect(formatElapsed(0)).toBe('00:00');
  });

  it('formats negative ms as 00:00', () => {
    expect(formatElapsed(-5000)).toBe('00:00');
  });

  it('formats 61 seconds as 01:01', () => {
    expect(formatElapsed(61_000)).toBe('01:01');
  });

  it('formats 15 minutes as 15:00', () => {
    expect(formatElapsed(15 * 60 * 1000)).toBe('15:00');
  });

  it('formats 90 seconds as 01:30', () => {
    expect(formatElapsed(90_000)).toBe('01:30');
  });

  it('pads single-digit minutes and seconds', () => {
    expect(formatElapsed(5_000)).toBe('00:05');
    expect(formatElapsed(65_000)).toBe('01:05');
  });
});

describe('MatchClock', () => {
  const baseProps = {
    currentQuarter: 1,
    quarterCount: 4,
  } as const;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows --:-- when status is not live', () => {
    render(
      <MatchClock
        {...baseProps}
        status="halftime"
        quarterStartedAt={Date.now()}
      />
    );
    expect(screen.getByText('--:--')).toBeInTheDocument();
  });

  it('shows --:-- when status is finished', () => {
    render(<MatchClock {...baseProps} status="finished" />);
    expect(screen.getByText('--:--')).toBeInTheDocument();
  });

  it('shows --:-- when live but quarterStartedAt is undefined', () => {
    render(<MatchClock {...baseProps} status="live" />);
    expect(screen.getByText('--:--')).toBeInTheDocument();
  });

  it('shows elapsed time when live in Q1 (global starts at 00:00)', () => {
    const now = Date.now();
    render(
      <MatchClock
        {...baseProps}
        status="live"
        quarterStartedAt={now - 65_000}
      />
    );
    expect(screen.getByText('01:05')).toBeInTheDocument();
  });

  it('anchors Q2 at 15:00', () => {
    const now = Date.now();
    render(
      <MatchClock
        currentQuarter={2}
        quarterCount={4}
        status="live"
        quarterStartedAt={now}
      />
    );
    expect(screen.getByText('15:00')).toBeInTheDocument();
  });

  it('anchors Q3 at 30:00', () => {
    const now = Date.now();
    render(
      <MatchClock
        currentQuarter={3}
        quarterCount={4}
        status="live"
        quarterStartedAt={now}
      />
    );
    expect(screen.getByText('30:00')).toBeInTheDocument();
  });

  it('anchors Q4 at 45:00', () => {
    const now = Date.now();
    render(
      <MatchClock
        currentQuarter={4}
        quarterCount={4}
        status="live"
        quarterStartedAt={now}
      />
    );
    expect(screen.getByText('45:00')).toBeInTheDocument();
  });

  it('anchors second half at 30:00 for 2-half matches', () => {
    const now = Date.now();
    render(
      <MatchClock
        currentQuarter={2}
        quarterCount={2}
        status="live"
        quarterStartedAt={now}
      />
    );
    expect(screen.getByText('30:00')).toBeInTheDocument();
  });

  it('shows paused global time correctly', () => {
    const now = Date.now();
    render(
      <MatchClock
        currentQuarter={2}
        quarterCount={4}
        status="live"
        quarterStartedAt={now - 90_000}
        pausedAt={now - 30_000}
      />
    );
    expect(screen.getByText('16:00')).toBeInTheDocument();
  });

  it('accounts for accumulated pause time while running', () => {
    const now = Date.now();
    render(
      <MatchClock
        currentQuarter={1}
        quarterCount={4}
        status="live"
        quarterStartedAt={now - 120_000}
        accumulatedPauseTime={60_000}
      />
    );
    expect(screen.getByText('01:00')).toBeInTheDocument();
  });

  it('ticks every second when live', () => {
    const now = Date.now();
    render(
      <MatchClock
        currentQuarter={2}
        quarterCount={4}
        status="live"
        quarterStartedAt={now}
      />
    );

    // Q2 starts at 15:00
    expect(screen.getByText('15:00')).toBeInTheDocument();

    // Advance 5 seconds
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(screen.getByText('15:05')).toBeInTheDocument();

    // Advance another 60 seconds
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(screen.getByText('16:05')).toBeInTheDocument();
  });

  it('has accessibility label for screen readers when live', () => {
    const now = Date.now();
    render(
      <MatchClock
        {...baseProps}
        status="live"
        quarterStartedAt={now - 125_000}
      />
    );
    const el = screen.getByLabelText(/Speeltijd/);
    expect(el).toBeInTheDocument();
  });

  it('has stopped label when not live', () => {
    render(<MatchClock {...baseProps} status="halftime" />);
    const el = screen.getByLabelText('Klok gestopt');
    expect(el).toBeInTheDocument();
  });
});
