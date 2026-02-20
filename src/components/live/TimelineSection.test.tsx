import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TimelineSection } from "./TimelineSection";
import type { MatchEvent } from "./types";

function buildEvent(overrides: Partial<MatchEvent> = {}): MatchEvent {
  return {
    type: "goal",
    quarter: 1,
    timestamp: new Date("2026-02-20T10:15:00.000Z").getTime(),
    ...overrides,
  };
}

describe("TimelineSection", () => {
  it("shows game minute and wall-clock for public timeline", () => {
    render(
      <TimelineSection
        teamName="DIA JO12-1"
        isScheduled={false}
        events={[buildEvent({ displayMinute: 23 })]}
      />
    );

    expect(screen.getByText("23'")).toBeInTheDocument();
    expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument();
  });

  it("shows 60+X notation when added time exists", () => {
    render(
      <TimelineSection
        teamName="DIA JO12-1"
        isScheduled={false}
        events={[buildEvent({ displayMinute: 60, displayExtraMinute: 2 })]}
      />
    );

    expect(screen.getByText("60+2'")).toBeInTheDocument();
  });
});
