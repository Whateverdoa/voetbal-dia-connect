import { describe, expect, it } from "vitest";
import { applyGoalEnrichments, deriveOpenStagedSubstitutions, projectPublicMatchEvents } from "./matchEventProjection";

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
  assistKind?: "pass" | "corner" | "free_kick";
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

  it("applies assistKind from the latest goal enrichment", () => {
    const goal = event({ _id: "goal-2", assistKind: "pass" });
    const enrich = event({
      _id: "enrich-kind",
      type: "goal_enrichment",
      targetEventId: "goal-2",
      assistKind: "corner",
      createdAt: 4,
    });

    const projected = applyGoalEnrichments([goal, enrich] as never);
    const projectedGoal = projected.find((e) => e._id === "goal-2");

    expect(projectedGoal?.assistKind).toBe("corner");
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

describe("pilot public projection", () => {
 it("keeps cumulative goals and exact corrections without leaking actors/private notes", () => {
  const first = { ...event({ _id: "q1", quarter: 1 }), actorSubject: "private-clerk", actorKind: "user" };
  const second = event({ _id: "q2", quarter: 2 });
  const privateEvents = ["clock_guard", "official_audit", "official_annotation", "incident", "substitution_staged", "substitution_cancelled"].map((type, i) => event({ _id: `private-${i}`, type }));
  const correction = { ...event({ _id: "undo", type: "goal_correction", targetEventId: "q1" }), actorSubject: "private-clerk", actorKind: "user" };
  const result = projectPublicMatchEvents([first, second, correction, ...privateEvents] as never);
  expect(result.map(e => e._id)).toEqual(["q1", "q2", "undo"]);
  expect(result[0].corrected).toBe(true); expect(result[1].corrected).toBe(false);
  expect(JSON.stringify(result)).not.toContain("private-clerk");
  expect(result.every(e => !("actorSubject" in e) && !("actorKind" in e))).toBe(true);
  expect(first.actorSubject).toBe("private-clerk");
 });
 it("merges scorer and assist independently while hiding enrichment events", () => {
  const result = projectPublicMatchEvents([
   event({ _id: "goal" }),
   event({ _id: "scorer", type: "goal_enrichment", targetEventId: "goal", playerName: "Mike", createdAt: 2 }),
   event({ _id: "assist", type: "goal_enrichment", targetEventId: "goal", relatedPlayerName: "Sam", createdAt: 3 }),
  ] as never);
  expect(result).toHaveLength(1); expect(result[0]).toMatchObject({ playerName: "Mike", relatedPlayerName: "Sam" });
 });
});
