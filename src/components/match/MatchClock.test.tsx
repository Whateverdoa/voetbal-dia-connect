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

  it('shows frozen time during halftime', () => {
    render(
      <MatchClock
        {...baseProps}
        status="halftime"
        frozenClockMs={16 * 60 * 1000 + 12_000}
      />
    );
    expect(screen.getByText('16:12')).toBeInTheDocument();
  });

  it('shows frozen time when status is finished', () => {
    render(<MatchClock {...baseProps} status="finished" frozenClockMs={62 * 60 * 1000 + 5_000} />);
    expect(screen.getByText('62:05')).toBeInTheDocument();
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

  it('keeps the main clock running during an interruption', () => {
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
    expect(screen.getByText('16:30')).toBeInTheDocument();
  });

  it('does not subtract accumulated legacy pause time from the main clock', () => {
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
    expect(screen.getByText('02:00')).toBeInTheDocument();
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

  it('has screen-reader label for frozen halftime clock', () => {
    render(<MatchClock {...baseProps} status="halftime" frozenClockMs={900_000} />);
    const el = screen.getByLabelText('Speeltijd: 15:00');
    expect(el).toBeInTheDocument();
  });
});

describe('official policy clock presentation', () => {
  it('shows nominal final time and separate actual playing time for 2P23BS', () => {
    render(<MatchClock currentQuarter={2} quarterCount={2} status="finished"
      refereeClock={{ elapsedMs: 4296254, periodStartedElapsedMs: 1896254, runningSince: null }} />);
    expect(screen.getByLabelText('Speeltijd: 70:00')).toBeInTheDocument();
    expect(screen.getByText('Werkelijke speeltijd: 71:36')).toBeInTheDocument();
  });
  it('warns instead of falling back to legacy wall time if the official anchor is missing', () => {
    render(<MatchClock currentQuarter={2} quarterCount={2} status="live" quarterStartedAt={Date.now()}
      refereeClock={{ elapsedMs: 4296254, runningSince: null }} />);
    expect(screen.getByText('Klok controleren')).toBeInTheDocument();
  });
});

describe("shared interruption timing display", () => {
  it("ticks an open measurement alongside the match clock and shows an absolute extra-time choice", () => {
    vi.useFakeTimers(); vi.setSystemTime(1_000_000);
    try {
      render(<MatchClock currentQuarter={1} quarterCount={2} regulationDurationMinutes={60} status="live" refereeClock={{ elapsedMs: 20000, runningSince: 1_000_000, periodStartedElapsedMs: 0, safetyMarginMinutes: 10, interruptionTiming: [{ period: 1, measuredMs: 10000, activeStartedElapsedMs: 15000, active: true, needsReview: false, chosenSeconds: 30 }] }} />);
      expect(screen.getByTestId("shared-interruption-timing")).toHaveTextContent("gemeten 00:15");
      expect(screen.getByTestId("shared-interruption-timing")).toHaveTextContent("Extra tijd 00:30");
      act(() => vi.advanceTimersByTime(5000));
      expect(screen.getByLabelText("Speeltijd: 00:25")).toBeInTheDocument();
      expect(screen.getByTestId("shared-interruption-timing")).toHaveTextContent("gemeten 00:20");
    } finally { vi.useRealTimers(); }
  });
  it("caps an old open measurement after 600 minutes and preserves a zero choice", () => {
    render(<MatchClock currentQuarter={1} quarterCount={2} status="finished" refereeClock={{ elapsedMs: 2400000, runningSince: null, periodStartedElapsedMs: 0, interruptionTiming: [{ period: 1, measuredMs: 0, activeStartedElapsedMs: 0, active: true, needsReview: true, chosenSeconds: 0 }] }} />);
    expect(screen.getByTestId("shared-interruption-timing")).toHaveTextContent("gemeten 15:00");
    expect(screen.getByTestId("shared-interruption-timing")).toHaveTextContent("Extra tijd 00:00");
    expect(screen.getByTestId("shared-interruption-timing")).toHaveTextContent("controle nodig");
  });
});

it("never shows remaining added time once the period is in halftime", () => {
 render(<MatchClock currentQuarter={1} quarterCount={2} regulationDurationMinutes={60} status="halftime" refereeClock={{elapsedMs:2400000,runningSince:null,periodStartedElapsedMs:0,interruptionTiming:[{period:1,measuredMs:20000,active:false,needsReview:false,chosenSeconds:600}]}} />);
 expect(screen.getByTestId("shared-interruption-timing")).toHaveTextContent("Extra tijd 10:00");
 expect(screen.getByTestId("shared-interruption-timing")).not.toHaveTextContent("nog");
});
