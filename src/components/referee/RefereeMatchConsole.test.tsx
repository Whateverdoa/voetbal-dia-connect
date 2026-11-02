import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { RefereeMatchConsole } from './RefereeMatchConsole';
vi.mock('./RefereeScoreFlow', () => ({ RefereeScoreFlow: () => null }));
vi.mock('./RefereeCardControls', () => ({ RefereeCardControls: () => null }));
vi.mock('./RefereeMatchHeader', () => ({ RefereeMatchHeader: () => null }));
vi.mock('@/components/match/EventTimeline', () => ({ EventTimeline: () => null }));
vi.mock('@/lib/matchClock/useQuarterEndReminder', () => ({ useQuarterEndReminder: () => ({ message: null, dismiss: vi.fn() }) }));
afterEach(() => vi.useRealTimers());
describe('persistent end-match confirmation', () => {
  it('stays linked to the end button beyond five seconds and cancellation restores the original action', () => {
    vi.useFakeTimers();
    render(<RefereeMatchConsole matchId={'local' as ComponentProps<typeof RefereeMatchConsole>['matchId']}
      status="live" currentQuarter={2} quarterCount={2} homeScore={2} awayScore={0}
      homeName="Sandbox" awayName="Tegenstander" homeLogoUrl={null} awayLogoUrl={null}
      diaTeamSide="home" diaPlayers={[]} />);
    const end = screen.getByRole('button', { name: 'Einde wedstrijd' });
    expect(end).toHaveAttribute('aria-controls', 'end-match-confirmation');
    fireEvent.click(end);
    expect(screen.getByRole('group', { name: 'Einde wedstrijd bevestigen' })).toBeInTheDocument();
    expect(screen.getByText('Sandbox 2 - 0 Tegenstander')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(10_000));
    expect(screen.getByRole('button', { name: 'Ja, wedstrijd beëindigen' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Terug naar wedstrijd' }));
    act(() => vi.advanceTimersByTime(100));
    expect(screen.getByRole('button', { name: 'Einde wedstrijd' })).toHaveFocus();
    expect(screen.queryByRole('group', { name: 'Einde wedstrijd bevestigen' })).not.toBeInTheDocument();
  });
});
