import { describe, expect, it } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";
import type { MatchPlayer, SubstitutionPlanRow } from "@/components/match/types";
import {
  momentIdFromTiming,
  planTimingFromMoment,
  projectSubstitutionMoments,
} from "./projectSubstitutionMoments";

const matchId = "match1" as Id<"matches">;

function player(
  id: string,
  name: string,
  onField: boolean,
  fieldSlotIndex?: number
): MatchPlayer {
  return {
    matchPlayerId: `mp-${id}` as Id<"matchPlayers">,
    playerId: id as Id<"players">,
    name,
    onField,
    isKeeper: false,
    fieldSlotIndex,
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

function fieldNames(players: MatchPlayer[]): string[] {
  return players.map((p) => p.name).sort();
}

function slotOf(players: MatchPlayer[], id: string): number | undefined {
  return players.find((p) => String(p.playerId) === id)?.fieldSlotIndex;
}

describe("projectSubstitutionMoments", () => {
  const players = [
    player("gk", "Keeper", true, 0),
    player("a", "A", true, 1),
    player("b", "B", true, 2),
    player("c", "C", false),
    player("d", "D", false),
    player("e", "E", false),
  ];

  it("builds kickoff plus one moment per timed substitution", () => {
    const moments = projectSubstitutionMoments(
      players,
      [
        plan(0, "a", "c", { targetQuarter: 1, targetMinute: 10 }),
        plan(1, "b", "d", { targetQuarter: 1, targetMinute: 12 }),
        plan(2, "c", "e", { targetQuarter: 1, targetMinute: 13 }),
      ],
      4
    );

    expect(moments.map((m) => m.label)).toEqual([
      "Begin",
      "K1 · min ~10",
      "K1 · min ~12",
      "K1 · min ~13",
    ]);
    expect(fieldNames(moments[0]!.onField)).toEqual(["A", "B", "Keeper"]);
    expect(fieldNames(moments[1]!.onField)).toEqual(["B", "C", "Keeper"]);
    expect(fieldNames(moments[2]!.onField)).toEqual(["C", "D", "Keeper"]);
    expect(fieldNames(moments[3]!.onField)).toEqual(["D", "E", "Keeper"]);
    expect(slotOf(moments[1]!.onField, "c")).toBe(1);
  });

  it("collapses same-time rows into one moment", () => {
    const moments = projectSubstitutionMoments(
      players,
      [
        plan(0, "a", "c", { targetQuarter: 2, targetMinute: 10 }),
        plan(1, "b", "d", { targetQuarter: 2, targetMinute: 10 }),
      ],
      4
    );

    expect(moments).toHaveLength(2);
    expect(moments[1]!.rows).toHaveLength(2);
    expect(fieldNames(moments[1]!.onField)).toEqual(["C", "D", "Keeper"]);
  });

  it("applies a position swap on its own moment", () => {
    const moments = projectSubstitutionMoments(
      players,
      [
        plan(0, "a", "b", {
          kind: "positionSwap",
          targetQuarter: 1,
          targetMinute: 5,
        }),
      ],
      2
    );

    expect(moments).toHaveLength(2);
    expect(moments[1]!.label).toBe("H1 · min ~5");
    expect(slotOf(moments[1]!.onField, "a")).toBe(2);
    expect(slotOf(moments[1]!.onField, "b")).toBe(1);
  });

  it("puts untimed rows in a trailing moment", () => {
    const moments = projectSubstitutionMoments(
      players,
      [
        plan(0, "a", "c", { targetQuarter: 1, targetMinute: 10 }),
        plan(1, "b", "d"),
      ],
      4
    );

    expect(moments.map((m) => m.label)).toEqual([
      "Begin",
      "K1 · min ~10",
      "Nog zonder tijdstip",
    ]);
    expect(fieldNames(moments[2]!.onField)).toEqual(["C", "D", "Keeper"]);
  });

  it("labels a quarter-start row without a minute", () => {
    const moments = projectSubstitutionMoments(
      players,
      [plan(0, "a", "c", { targetQuarter: 2 })],
      4
    );

    expect(moments[1]!.label).toBe("Start kwart 2");
  });
});

describe("momentIdFromTiming", () => {
  it("builds ids for boundary, timed, and untimed rows", () => {
    expect(momentIdFromTiming({ targetQuarter: 1 })).toBe("q1-mstart");
    expect(momentIdFromTiming({ targetQuarter: 2, targetMinute: 15 })).toBe(
      "q2-m15"
    );
    expect(momentIdFromTiming({})).toBe("untimed");
  });
});

describe("planTimingFromMoment", () => {
  it("maps Begin to start of quarter 1", () => {
    expect(planTimingFromMoment({ id: "kickoff", rows: [] })).toEqual({
      targetQuarter: 1,
      insertAtQuarterBoundary: true,
    });
  });

  it("copies minute timing without quarter-boundary insert", () => {
    expect(
      planTimingFromMoment({
        id: "q2-m10",
        rows: [plan(0, "a", "c", { targetQuarter: 2, targetMinute: 10 })],
      })
    ).toEqual({
      targetQuarter: 2,
      targetMinute: 10,
      insertAtQuarterBoundary: false,
    });
  });

  it("maps quarter-start moments to boundary insert", () => {
    expect(
      planTimingFromMoment({
        id: "q2-mstart",
        rows: [plan(0, "a", "c", { targetQuarter: 2 })],
      })
    ).toEqual({
      targetQuarter: 2,
      insertAtQuarterBoundary: true,
    });
  });

  it("leaves untimed moments without quarter or minute", () => {
    expect(planTimingFromMoment({ id: "untimed", rows: [] })).toEqual({
      insertAtQuarterBoundary: false,
    });
  });
});
