import { describe, expect, it } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";
import type { MatchPlayer, SubstitutionPlanRow } from "@/components/match/types";
import { projectSubstitutionPlan } from "./projectSubstitutionPlan";

const matchId = "match1" as Id<"matches">;

function player(id: string, name: string, onField: boolean): MatchPlayer {
  return {
    matchPlayerId: `mp-${id}` as Id<"matchPlayers">,
    playerId: id as Id<"players">,
    name,
    onField,
    isKeeper: false,
  };
}

function plan(
  sequence: number,
  outId: string,
  inId: string,
  status: SubstitutionPlanRow["status"] = "pending"
): SubstitutionPlanRow {
  return {
    _id: `plan-${sequence}` as Id<"substitutionPlans">,
    matchId,
    sequence,
    playerOutId: outId as Id<"players">,
    playerInId: inId as Id<"players">,
    status,
    createdAt: sequence,
    updatedAt: sequence,
  };
}

function names(players: MatchPlayer[]): string[] {
  return players.map((p) => p.name).sort();
}

describe("projectSubstitutionPlan", () => {
  const players = [
    player("a", "A", true),
    player("b", "B", true),
    player("c", "C", false),
    player("d", "D", false),
  ];

  it("moves the first planned substitute into the projected field and changes the bench", () => {
    const result = projectSubstitutionPlan(players, [plan(0, "a", "c")]);

    expect(names(result.startingBench)).toEqual(["C", "D"]);
    expect(names(result.projectedOnField)).toEqual(["B", "C"]);
    expect(names(result.projectedBench)).toEqual(["A", "D"]);
    expect(result.warnings).toEqual([]);
  });

  it("chains substitutions in sequence order", () => {
    const result = projectSubstitutionPlan(players, [
      plan(1, "b", "a"),
      plan(0, "a", "c"),
    ]);

    expect(names(result.projectedOnField)).toEqual(["A", "C"]);
    expect(names(result.projectedBench)).toEqual(["B", "D"]);
  });

  it("ignores skipped and executed rows for future planning", () => {
    const result = projectSubstitutionPlan(players, [
      plan(0, "a", "c", "executed"),
      plan(1, "b", "d", "skipped"),
    ]);

    expect(names(result.projectedOnField)).toEqual(["A", "B"]);
    expect(names(result.projectedBench)).toEqual(["C", "D"]);
  });

  it("warns for stale rows and continues from the last valid state", () => {
    const result = projectSubstitutionPlan(players, [
      plan(0, "a", "c"),
      plan(1, "a", "d"),
      plan(2, "b", "a"),
    ]);

    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]?.message).toContain("niet op het veld");
    expect(names(result.projectedOnField)).toEqual(["A", "C"]);
    expect(names(result.projectedBench)).toEqual(["B", "D"]);
  });
});
