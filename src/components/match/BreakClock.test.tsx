import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { BreakClock } from "./BreakClock";

afterEach(() => vi.useRealTimers());

describe("BreakClock", () => {
  it("keeps hooks stable when a break is scheduled and then removed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    const { rerender } = render(<BreakClock />);
    expect(screen.queryByText("Rustklok")).not.toBeInTheDocument();
    rerender(<BreakClock scheduledBreakEndAt={61000} autoStart={false} />);
    expect(screen.getByText("01:00")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(60000));
    expect(screen.getByText("Rust voorbij")).toBeInTheDocument();
    rerender(<BreakClock />);
    expect(screen.queryByText("Rustklok")).not.toBeInTheDocument();
  });
});
