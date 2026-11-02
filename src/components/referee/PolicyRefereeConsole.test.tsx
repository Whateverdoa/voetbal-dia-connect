import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ConvexError } from 'convex/values';
import type { RefereeDetail } from '@/convex/lib/refereeMatchRead';
import { PolicyRefereeConsole } from './PolicyRefereeConsole';
import { effectiveCommandVersion, useOfficialRefereeCommand } from './useOfficialRefereeCommand';
const h = vi.hoisted(() => ({ match: undefined as RefereeDetail | undefined, mutate: vi.fn(), timeline: { results: [] as object[], status: 'Exhausted', loadMore: vi.fn() } }));
vi.mock('convex/react', () => ({ useQuery: () => h.match, useMutation: () => h.mutate, usePaginatedQuery: () => h.timeline }));
vi.mock('./RefereeMatchHeader', () => ({ RefereeMatchHeader: () => <h1>Wedstrijd</h1> }));
function fixture(): RefereeDetail { return { apiVersion: 1, clockPolicyVersion: 1, writesEnabled: true, actorSubject: 'local-ref', matchId: 'local-match' as RefereeDetail['matchId'], teamId: 'local-team' as RefereeDetail['teamId'], teamName: 'Sandbox', opponent: 'Test', isHome: true, status: 'scheduled', homeScore: 0, awayScore: 0, period: 1, periodCount: 2, periodMinutes: 30, controller: 'referee', eligibleToControl: true, canControl: true, canAnnotate: true, expiresAt: Date.now() + 3600000, version: 0, serverNow: Date.now(), clockGuardPending: false, players: [], clock: { elapsedMs: 0, runningSince: null, periodStartedElapsedMs: 0, safetyMarginMinutes: 10, confirmedStoppageMs: 0, regularTimeReached: false }, interruptionTiming: { measurements: [], chosenSeconds: {} } }; }
beforeEach(() => { h.match = fixture(); h.timeline.results = []; h.mutate.mockReset(); h.mutate.mockImplementation(async intent => ({ commandEventId: 'receipt', commandCorrelationId: intent.correlationId, version: intent.expectedVersion + 1 })); });
afterEach(() => vi.useRealTimers());
it('starts through the protected versioned contract, never a legacy path', async () => {
  render(<PolicyRefereeConsole matchId={h.match!.matchId} />);
  fireEvent.click(screen.getByRole('button', { name: 'Start wedstrijd' }));
  await waitFor(() => expect(h.mutate).toHaveBeenCalledTimes(1));
  expect(h.mutate.mock.calls[0][0]).toMatchObject({ matchId: 'local-match', expectedVersion: 0, actorSubject: 'local-ref', action: { kind: 'start' } });
});
it('retries the identical uncertain command and blocks new intents', async () => {
  h.mutate.mockRejectedValueOnce(new Error('Lost acknowledgement'));
  const { result } = renderHook(() => useOfficialRefereeCommand(h.match, h.match!.serverNow));
  await act(async () => { await result.current.act({ kind: 'start' }); });
  const original = h.mutate.mock.calls[0][0];
  await act(async () => { await result.current.act({ kind: 'goal', team: 'home' }); });
  expect(h.mutate).toHaveBeenCalledTimes(1);
  await act(async () => { await result.current.retry(); });
  expect(h.mutate.mock.calls[1][0]).toEqual(original);
  expect(result.current.pending).toBeNull(); expect(result.current.waitingForRead).toBe(true);
});
it('structured version conflicts are rejected instead of becoming an uncertain retry', async () => {
  h.mutate.mockRejectedValue(new ConvexError('VERSION_CONFLICT'));
  const { result } = renderHook(() => useOfficialRefereeCommand(h.match, h.match!.serverNow));
  await act(async () => { await result.current.act({ kind: 'start' }); });
  expect(result.current.pending).toBeNull(); expect(result.current.error).toContain('geweigerd');
});
it('never enables registration for a read-only account', () => {
  h.match!.canControl = false; h.match!.canAnnotate = false;
  render(<PolicyRefereeConsole matchId={h.match!.matchId} />);
  expect(screen.getByRole('button', { name: 'Start wedstrijd' })).toBeDisabled();
});
it('measures an interruption without sending pause and saves an absolute extra-time choice', async () => {
  h.match!.status = 'live'; h.match!.clock!.runningSince = Date.now() - 20000;
  const { unmount } = render(<PolicyRefereeConsole matchId={h.match!.matchId} />);
  fireEvent.click(screen.getByRole('button', { name: 'Onderbreking meten' }));
  await waitFor(() => expect(h.mutate).toHaveBeenCalledTimes(1));
  expect(h.mutate.mock.calls[0][0].action.kind).toBe('sync_interruption_timing');
  expect(h.mutate.mock.calls[0][0].action.timing.measurements[0]).toMatchObject({ kind: 'interruption', period: 1 });
  unmount(); h.mutate.mockClear();
  render(<PolicyRefereeConsole matchId={h.match!.matchId} />);
  fireEvent.change(screen.getByLabelText('Extra tijd in seconden'), { target: { value: '60' } });
  fireEvent.click(screen.getByRole('button', { name: 'Extra tijd opslaan' }));
  await waitFor(() => expect(h.mutate).toHaveBeenCalledTimes(1));
  expect(h.mutate.mock.calls[0][0].action.timing.chosenSeconds).toEqual({ '1': 60 });
});
it('keeps end confirmation linked and explicit during a long real clock pause', () => {
  h.match!.status = 'live'; h.match!.clock!.stoppageStartedAt = Date.now() - 901000;
  render(<PolicyRefereeConsole matchId={h.match!.matchId} />);
  fireEvent.click(screen.getByRole('button', { name: 'Einde periode' }));
  expect(screen.getByRole('group', { name: 'Einde periode bevestigen' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Afsluiten: pauze niet meetellen' })).toBeInTheDocument();
});
it('predicts one guard version at the limit, not a second one already projected by a query', () => {
  const m = fixture(); m.status = 'live'; m.clock!.runningSince = 1000;
  expect(effectiveCommandVersion(m, 1000 + 40 * 60000)).toBe(1);
  m.clock!.runningSince = null; m.clock!.elapsedMs = 40 * 60000; m.clock!.clockReviewReason = 'period_limit'; m.version = 1; m.clockGuardPending = true;
  expect(effectiveCommandVersion(m, 1000 + 40 * 60000)).toBe(1);
});
it('blocks an expired scope before sending a command', async () => {
  h.match!.expiresAt = h.match!.serverNow - 1;
  const { result } = renderHook(() => useOfficialRefereeCommand(h.match, h.match!.serverNow));
  await act(async () => { expect(await result.current.act({ kind: 'start' })).toBeNull(); });
  expect(h.mutate).not.toHaveBeenCalled();
});
it('team first clears the previous player and sends the opponent number without an own-team ID', async () => {
  h.match!.status = 'live'; h.match!.clock!.runningSince = Date.now();
  h.match!.players = [{ playerId: 'own-player' as RefereeDetail['players'][number]['playerId'], name: 'Spits', number: 7 }];
  render(<PolicyRefereeConsole matchId={h.match!.matchId} />);
  fireEvent.change(screen.getByLabelText('Speler'), { target: { value: 'own-player' } });
  fireEvent.change(screen.getByLabelText('Team'), { target: { value: 'away' } });
  expect(screen.queryByLabelText('Speler')).not.toBeInTheDocument();
  const number = screen.getByLabelText('Rugnummer'); expect(number).toHaveAttribute('inputmode', 'numeric');
  fireEvent.change(number, { target: { value: '12' } });
  fireEvent.click(screen.getByRole('button', { name: 'Gele kaart' }));
  await waitFor(() => expect(h.mutate).toHaveBeenCalledTimes(1));
  expect(h.mutate.mock.calls[0][0].action).toEqual({ kind: 'yellow_card', team: 'away', playerId: undefined, reportedNumber: 12 });
});
it('corrects the exact latest uncorrected goal, not an arbitrary score delta', async () => {
  h.match!.status = 'live';
  h.timeline.results = [{ id: 'already-corrected', type: 'goal', corrected: true, quarter: 1 }, { id: 'original-goal', type: 'goal', corrected: false, quarter: 1 }];
  render(<PolicyRefereeConsole matchId={h.match!.matchId} />);
  fireEvent.click(screen.getByRole('button', { name: 'Laatste doelpunt ongedaan maken' }));
  await waitFor(() => expect(h.mutate).toHaveBeenCalledTimes(1));
  expect(h.mutate.mock.calls[0][0].action).toEqual({ kind: 'correct_goal', eventId: 'original-goal' });
});
it('initializes extra time from the shared period choice rather than silently showing zero', () => {
  h.match!.status = 'live'; h.match!.interruptionTiming!.chosenSeconds = { '1': 90 };
  render(<PolicyRefereeConsole matchId={h.match!.matchId} />);
  expect(screen.getByRole('spinbutton', { name: 'Extra tijd in seconden' })).toHaveValue(90);
});
