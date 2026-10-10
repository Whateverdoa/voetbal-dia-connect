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

  it("shows an own goal as extra registration, credited to the other team", () => {
    const event = buildEvent({
      type: "goal",
      isOwnGoal: true,
      isOpponentGoal: true,
      note: "Rugnummer: 9",
    });

    render(
      <EventTimeline
        events={[event]}
        teamName="DIA JO13-1"
        opponentName="VOAB"
      />,
    );

    expect(
      screen.getByText("Eigen doelpunt DIA JO13-1 #9 · telt voor VOAB"),
    ).toBeInTheDocument();
  });

  it("shows a penalty on a goal", () => {
    const event = buildEvent({
      type: "goal",
      playerName: "Jan",
      assistKind: "penalty",
    });

    render(<EventTimeline events={[event]} teamName="TEST Sandbox" />);

    expect(
      screen.getByText("Doelpunt Jan (TEST Sandbox) · Penalty"),
    ).toBeInTheDocument();
  });

  it("shows opponent card identity when the official reported a number", () => {
    const event = buildEvent({
      type: "yellow_card",
      isOpponentCard: true,
      playerName: "#4 Vos",
    });

    render(<EventTimeline events={[event]} opponentName="VOAB" />);

    expect(screen.getByText("Gele kaart VOAB · #4 Vos")).toBeInTheDocument();
  });

  it("shows a shirt-number goal and hides substitutions on the official log", () => {
    render(
      <EventTimeline
        title="Registratie"
        emptyText="Nog geen doelpunten of kaarten."
        types={["goal", "yellow_card", "red_card"]}
        teamName="TEST Sandbox"
        events={[
          buildEvent({ type: "sub_out", playerName: "Henk" }),
          buildEvent({
            _id: "evt_2" as MatchEvent["_id"],
            type: "goal",
            note: "Rugnummer: 7",
          }),
        ]}
      />,
    );

    expect(screen.getByText("Registratie (1)")).toBeInTheDocument();
    expect(
      screen.getByText("Doelpunt #7 (TEST Sandbox)"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Henk/)).not.toBeInTheDocument();
  });

  it("falls back to wall-clock if minute data is missing", () => {
    const event = buildEvent({ displayMinute: undefined, displayExtraMinute: undefined });

    render(<EventTimeline events={[event]} />);

    expect(screen.queryByText("10'")).not.toBeInTheDocument();
    expect(screen.getByText(/\d{2}:\d{2}/)).toBeInTheDocument();
  });
});
