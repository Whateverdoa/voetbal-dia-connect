import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EventTimeline } from "./EventTimeline";
import type { MatchEvent } from "./types";

function buildEvent(overrides: Partial<MatchEvent> = {}): MatchEvent {
  return {
    _id: "evt_1" as MatchEvent["_id"],
    type: "goal",
    quarter: 1,
    timestamp: new Date("2026-02-20T10:15:00.000Z").getTime(),
    ...overrides,
  };
}

describe("EventTimeline", () => {
  it("renders football minute and wall-clock when minute data exists", () => {
    const event = buildEvent({ displayMinute: 10 });

    render(<EventTimeline events={[event]} />);

    expect(screen.getByText("10'")).toBeInTheDocument();
    expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it("renders added time in 60+X format", () => {
    const event = buildEvent({ displayMinute: 60, displayExtraMinute: 4 });

    render(<EventTimeline events={[event]} />);

    expect(screen.getByText("60+4'")).toBeInTheDocument();
  });

  it("falls back to wall-clock if minute data is missing", () => {
    const event = buildEvent({ displayMinute: undefined, displayExtraMinute: undefined });

    render(<EventTimeline events={[event]} />);

    expect(screen.queryByText("10'")).not.toBeInTheDocument();
    expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument();
  });
});
