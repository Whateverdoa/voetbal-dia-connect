import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { GoalsSection } from "./GoalsSection";
import type { MatchEvent } from "./types";
it("keeps a corrected goal in the audit timeline, but excludes it from the scorer summary", () => {
 const events = [
  { type: "goal", quarter: 1, playerName: "Corrected scorer", corrected: true },
  { type: "goal", quarter: 2, playerName: "Valid scorer" },
  { type: "goal", quarter: 2, playerName: "Opponent", isOpponentGoal: true },
 ] as MatchEvent[];
 render(<GoalsSection events={events} teamName="Fixture" />);
 expect(screen.queryByText("Corrected scorer")).not.toBeInTheDocument();
 expect(screen.queryByText("Opponent")).not.toBeInTheDocument();
 expect(screen.getByText("Valid scorer")).toBeInTheDocument();
 expect(events).toHaveLength(3);
});
