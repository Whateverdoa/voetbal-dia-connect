import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { RefereeClockPanel } from './RefereeClockPanel';
import type { ComponentProps } from 'react';
const props: ComponentProps<typeof RefereeClockPanel> = {
  matchId: 'local' as ComponentProps<typeof RefereeClockPanel>['matchId'], status: 'live', currentQuarter: 2, quarterCount: 2,
  matchSummary: 'Sandbox 2 - 0 Tegenstander', isLoading: false, clockError: null,
  endMatchConfirm: true, onSetEndMatchConfirm: vi.fn(), onStartMatch: vi.fn(), onNextQuarter: vi.fn(),
  onResumeHalftime: vi.fn(), onClockAction: vi.fn(), onClockError: vi.fn(),
};
describe('end match confirmation', () => {
  it('shows an explicitly labelled panel, match score and descriptive confirm/cancel actions', () => {
    render(<RefereeClockPanel {...props} />);
    expect(screen.getByRole('group', { name: 'Einde wedstrijd bevestigen' })).toBeInTheDocument();
    expect(screen.getByText('Sandbox 2 - 0 Tegenstander')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Einde wedstrijd bevestigen' })).toHaveFocus();
    expect(props.onClockAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Terug naar wedstrijd' }));
    expect(props.onSetEndMatchConfirm).toHaveBeenCalledWith(false);
    expect(props.onClockAction).not.toHaveBeenCalled();
  });
  it('executes the finish action only after explicit confirmation', () => {
    vi.clearAllMocks(); render(<RefereeClockPanel {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Ja, wedstrijd beëindigen' }));
    expect(props.onClockAction).toHaveBeenCalledWith(props.onNextQuarter, props.onClockError);
  });
});
