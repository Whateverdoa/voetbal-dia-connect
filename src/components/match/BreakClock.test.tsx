import { render, screen, act } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { BreakClock } from './BreakClock';
afterEach(() => vi.useRealTimers());
it('keeps hooks stable when a break end is added, removed and replaced', () => {
  vi.useFakeTimers(); vi.setSystemTime(1000);
  const { rerender } = render(<BreakClock autoStart={false} />);
  expect(screen.queryByText('Rustklok')).not.toBeInTheDocument();
  rerender(<BreakClock scheduledBreakEndAt={3000} autoStart={false} />);
  expect(screen.getByText('00:02')).toBeInTheDocument();
  act(() => vi.advanceTimersByTime(2000));
  expect(screen.getByText('Rust voorbij')).toBeInTheDocument();
  rerender(<BreakClock autoStart={false} />);
  rerender(<BreakClock scheduledBreakEndAt={5000} autoStart={false} />);
  expect(screen.getByText('00:02')).toBeInTheDocument();
});
