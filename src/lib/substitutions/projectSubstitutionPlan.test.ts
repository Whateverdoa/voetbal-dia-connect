import { describe, expect, it } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";
import type { MatchPlayer, SubstitutionPlanRow } from "@/components/match/types";
import { projectSubstitutionPlan } from "./projectSubstitutionPlan";

const matchId = "match1" as Id<"matches">;

function player(
  id: string,
  name: string,
  onField: boolean,
  fieldSlotIndex?: number,
  absent?: boolean
): MatchPlayer {
  return {
    matchPlayerId: `mp-${id}` as Id<"matchPlayers">,
    playerId: id as Id<"players">,
    name,
    onField,
    isKeeper: false,
    fieldSlotIndex,
    absent,
  };
}

function plan(
  sequence: number,
  outId: string,
  inId: string,
  options?: Partial<SubstitutionPlanRow>
): SubstitutionPlanRow {
  return {
    _id: `plan-${sequence}` as Id<"substitutionPlans">,
    matchId,
    sequence,
    kind: "substitution",
    playerOutId: outId as Id<"players">,
    playerInId: inId as Id<"players">,
    status: "pending",
    createdAt: sequence,
    updatedAt: sequence,
    ...options,
  };
}

function names(players: MatchPlayer[]): string[] {
  return players.map((player) => player.name).sort();
}

describe("projectSubstitutionPlan", () => {
  const players = [
    player("gk", "Keeper", true, 0),
    player("a", "A", true, 1),
    player("b", "B", true, 2),
    player("c", "C", false),
    player("d", "D", false),
    player("e", "E", false, undefined, true),
  ];

  it("moves the first planned substitute into the projected field and changes the bench", () => {
    const result = projectSubstitutionPlan(players, [plan(0, "a", "c")]);

    expect(names(result.startingBench)).toEqual(["C", "D"]);
    expect(names(result.projectedOnField)).toEqual(["B", "C", "Keeper"]);
    expect(names(result.projectedBench)).toEqual(["A", "D"]);
    expect(result.warnings).toEqual([]);
  });

  it("chains substitutions in sequence order for the overall projection", () => {
    const result = projectSubstitutionPlan(players, [
      plan(1, "b", "a"),
      plan(0, "a", "c"),
    ]);

    expect(names(result.projectedOnField)).toEqual(["A", "C", "Keeper"]);
    expect(names(result.projectedBench)).toEqual(["B", "D"]);
  });

  it("builds a quarter preview from earlier quarters plus the selected quarter", () => {
    const result = projectSubstitutionPlan(
      players,
      [
        plan(0, "a", "c", { targetQuarter: 1 }),
        plan(1, "b", "d", { targetQuarter: 2 }),
      ],
      2
    );

    expect(result.quarterPreview).toBeDefined();
    expect(names(result.quarterPreview!.quarterStartOnField)).toEqual(["B", "C", "Keeper"]);
    expect(names(result.quarterPreview!.projectedOnField)).toEqual(["C", "D", "Keeper"]);
    expect(names(result.quarterPreview!.quarterStartBench)).toEqual(["A", "D"]);
    expect(names(result.quarterPreview!.projectedBench)).toEqual(["A", "B"]);
  });

  it("ignores later quarters in the selected quarter preview", () => {
    const result = projectSubstitutionPlan(
      players,
      [
        plan(0, "a", "c", { targetQuarter: 2 }),
        plan(1, "b", "d", { targetQuarter: 4 }),
      ],
      2
    );

    expect(names(result.quarterPreview!.projectedOnField)).toEqual(["B", "C", "Keeper"]);
    expect(names(result.quarterPreview!.projectedBench)).toEqual(["A", "D"]);
  });

  it("ignores skipped and executed rows for future planning", () => {
    const result = projectSubstitutionPlan(players, [
      plan(0, "a", "c", { status: "executed" }),
      plan(1, "b", "d", { status: "skipped" }),
    ]);

    expect(names(result.projectedOnField)).toEqual(["A", "B", "Keeper"]);
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
    expect(names(result.projectedOnField)).toEqual(["A", "C", "Keeper"]);
    expect(names(result.projectedBench)).toEqual(["B", "D"]);
  });

  it("excludes quarterless rows from the quarter preview and reports them separately", () => {
    const result = projectSubstitutionPlan(
      players,
      [
        plan(0, "a", "c"),
        plan(1, "b", "d", { targetQuarter: 2 }),
      ],
      2
    );

    expect(result.quarterlessPendingRows).toHaveLength(1);
    expect(names(result.quarterPreview!.quarterStartOnField)).toEqual(["A", "B", "Keeper"]);
    expect(names(result.quarterPreview!.projectedOnField)).toEqual(["A", "D", "Keeper"]);
  });

  it("excludes absent players from projected candidates", () => {
    const result = projectSubstitutionPlan(players, [plan(0, "a", "c")]);

    expect(names(result.startingBench)).not.toContain("E");
    expect(names(result.projectedBench)).not.toContain("E");
  });

  it("transfers the field slot to the incoming player in projections", () => {
    const result = projectSubstitutionPlan(players, [plan(0, "a", "c")]);
    const incoming = result.projectedOnField.find((current) => current.name === "C");

    expect(incoming?.fieldSlotIndex).toBe(1);
  });

  it("applies planned position swaps before later substitutions", () => {
    const result = projectSubstitutionPlan(players, [
      plan(0, "a", "b", { kind: "positionSwap", targetQuarter: 1 }),
      plan(1, "b", "c", { targetQuarter: 1 }),
    ]);
    const playerA = result.projectedOnField.find((current) => current.name === "A");
    const playerC = result.projectedOnField.find((current) => current.name === "C");

    expect(playerA?.fieldSlotIndex).toBe(2);
    expect(playerC?.fieldSlotIndex).toBe(1);
  });
});
