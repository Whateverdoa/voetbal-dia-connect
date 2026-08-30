import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BreakClock } from "./BreakClock";

describe("BreakClock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-30T09:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("can switch between hidden and scheduled without changing hook order", () => {
    const breakEnd = Date.now() + 60_000;
    const { rerender } = render(<BreakClock />);

    expect(screen.queryByText("Rustklok")).not.toBeInTheDocument();

    rerender(<BreakClock scheduledBreakEndAt={breakEnd} />);
    expect(screen.getByText("01:00")).toBeInTheDocument();

    rerender(<BreakClock />);
    expect(screen.queryByText("Rustklok")).not.toBeInTheDocument();
  });
});
