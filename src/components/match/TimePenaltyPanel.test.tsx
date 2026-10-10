import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { TimePenaltyPanel } from "./TimePenaltyPanel";
import type { MatchEvent } from "./types";
import type { Id } from "@/convex/_generated/dataModel";

describe("TimePenaltyPanel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(1_000_000));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a yellow countdown that ticks down", () => {
    const events: MatchEvent[] = [
      {
        _id: "e1" as Id<"matchEvents">,
        type: "yellow_card",
        playerId: "p1" as Id<"players">,
        playerName: "Jan",
        note: "gele kaart · tijdstraf 5 min",
        quarter: 1,
        timestamp: 1_000_000 - 60_000,
      },
    ];

    render(
      <TimePenaltyPanel events={events} status="live" />
    );

    expect(screen.getByText(/Jan/)).toBeInTheDocument();
    expect(screen.getAllByText("Tijdstraf").length).toBeGreaterThan(0);
    expect(screen.getByText("4:00")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1000);
    });
  });

  it("shows paused badge when stoppage is active", () => {
    const events: MatchEvent[] = [
      {
        _id: "e1" as Id<"matchEvents">,
        type: "yellow_card",
        playerId: "p1" as Id<"players">,
        playerName: "Jan",
        note: "gele kaart · tijdstraf 5 min",
        quarter: 1,
        timestamp: 900_000,
      },
    ];

    render(
      <TimePenaltyPanel
        events={events}
        status="live"
        activeStoppageStartedAt={950_000}
      />
    );

    expect(screen.getByText("Gepauzeerd")).toBeInTheDocument();
  });
});
