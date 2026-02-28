import { describe, expect, it } from "vitest";
import { applyGoalEnrichments, deriveOpenStagedSubstitutions } from "./matchEventProjection";

type AnyEvent = {
  _id: string;
  type: string;
  matchId: string;
  quarter: number;
  createdAt: number;
  timestamp: number;
  playerId?: string;
  relatedPlayerId?: string;
  playerName?: string;
  relatedPlayerName?: string;
  targetEventId?: string;
  stagedEventId?: string;
  gameSecond?: number;
  matchMs?: number;
};

function event(overrides: Partial<AnyEvent>): AnyEvent {
  return {
    _id: "e-1",
    type: "goal",
    matchId: "m-1",
    quarter: 1,
    createdAt: 1,
    timestamp: 1,
    ...overrides,
  };
}

describe("matchEventProjection", () => {
  it("applies latest goal enrichment", () => {
    const goal = event({ _id: "goal-1", playerName: undefined });
    const enrichA = event({
      _id: "enrich-a",
      type: "goal_enrichment",
      targetEventId: "goal-1",
      playerName: "Jens",
      createdAt: 2,
    });
    const enrichB = event({
      _id: "enrich-b",
      type: "goal_enrichment",
      targetEventId: "goal-1",
      playerName: "Lars",
      createdAt: 3,
    });

    const projected = applyGoalEnrichments([goal, enrichA, enrichB] as never);
    const projectedGoal = projected.find((e) => e._id === "goal-1");

    expect(projectedGoal?.playerName).toBe("Lars");
  });

  it("returns only open staged substitutions", () => {
    const staged = event({
      _id: "staged-1",
      type: "substitution_staged",
      playerId: "out-1",
      relatedPlayerId: "in-1",
      playerName: "Out",
      relatedPlayerName: "In",
      createdAt: 2,
    });
    const cancelled = event({
      _id: "cancelled-1",
      type: "substitution_cancelled",
      stagedEventId: "staged-1",
      createdAt: 3,
    });
    const open = event({
      _id: "staged-2",
      type: "substitution_staged",
      playerId: "out-2",
      relatedPlayerId: "in-2",
      playerName: "Out 2",
      relatedPlayerName: "In 2",
      createdAt: 4,
    });

    const stagedSubs = deriveOpenStagedSubstitutions(
      [staged, cancelled, open] as never
    );

    expect(stagedSubs).toHaveLength(1);
    expect(String(stagedSubs[0].stagedEventId)).toBe("staged-2");
  });
});
