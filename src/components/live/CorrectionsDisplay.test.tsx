import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { GoalsSection } from "./GoalsSection";
import { TimelineSection } from "./TimelineSection";
import { markCorrectedGoals } from "@/lib/goalCorrections";
import type { MatchEvent } from "./types";

const events: MatchEvent[] = [
  { _id: "goal-a", type: "goal", playerName: "Test Spits A", quarter: 1, timestamp: 1 },
  { _id: "goal-b", type: "goal", playerName: "Test Rechtsback", quarter: 1, timestamp: 2 },
  { _id: "opponent-goal", type: "goal", isOpponentGoal: true, quarter: 1, timestamp: 3 },
  { _id: "undo-b", type: "goal_correction", targetEventId: "goal-b", quarter: 1, timestamp: 4 },
  { _id: "undo-opponent", type: "goal_correction", targetEventId: "opponent-goal", quarter: 1, timestamp: 5 },
  { _id: "goal-c", type: "goal", quarter: 1, timestamp: 6 },
];
describe("goal correction display", () => {
  it("excludes both corrected goals from scorer summaries without changing history", () => {
    render(<GoalsSection events={events} teamName="TEST Sandbox" />);
    expect(screen.getByText("Test Spits A")).toBeInTheDocument();
    expect(screen.getByText("Goal")).toBeInTheDocument();
    expect(screen.queryByText("Test Rechtsback")).not.toBeInTheDocument();
    expect(events).toHaveLength(6); expect(events[1].corrected).toBeUndefined();
  });
  it("retains corrected goals and labels corrections in readable Dutch", () => {
    render(<TimelineSection events={events} teamName="TEST Sandbox" opponentName="test iphone 2" isScheduled={false} />);
    expect(screen.getAllByText("Gecorrigeerd")).toHaveLength(2);
    expect(screen.getAllByText("Doelpunt teruggedraaid")).toHaveLength(2);
    expect(screen.queryByText("goal_correction")).not.toBeInTheDocument();
  });
  it("honours a server-projected correction even if its audit event is not in this view", () => {
    render(<GoalsSection events={[{ ...events[1], corrected: true }]} teamName="TEST Sandbox" />);
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });
  it("matches exact target IDs, including out-of-order history and repeated projections", () => {
    const result = markCorrectedGoals([...events].reverse());
    expect(result.find(e => e._id === "goal-a")?.corrected).toBe(false);
    expect(result.find(e => e._id === "goal-b")?.corrected).toBe(true);
    expect(markCorrectedGoals(result)).toEqual(result);
  });
});

it("shows incident category without free-text clinical or private comments", () => {
  render(<TimelineSection events={[{ _id: "injury", type: "incident", quarter: 1, timestamp: 1, incidentCategory: "Blessure", note: "PRIVATE" }]} teamName="Sandbox" opponentName="Opponent" isScheduled={false} />);
  expect(screen.getByText("Incident: Blessure")).toBeInTheDocument();
  expect(screen.queryByText("PRIVATE")).not.toBeInTheDocument();
});
