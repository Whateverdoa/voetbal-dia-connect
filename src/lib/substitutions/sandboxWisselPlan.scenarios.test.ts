import { describe, expect, it } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";
import type { MatchPlayer, SubstitutionPlanRow } from "@/components/match/types";
import { projectSubstitutionPlan } from "@/lib/substitutions/projectSubstitutionPlan";
import {
  JO13_STYLE_SEASON_MINUTES,
  playersByFewestMinutes,
} from "@/test/fixtures/jo13StyleSeasonMinutes";

const matchId = "sandbox-match" as Id<"matches">;

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
    number: Number(id.replace("test-", "")) || undefined,
    onField,
    isKeeper: id === "test-1",
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

function names(players: MatchPlayer[]): string[] {
  return players.map((p) => p.name).sort();
}

/**
 * TEST Sandbox scenarios: plan → live sub (already on field) → continue planning.
 * Season minutes follow a JO13-2-style uneven distribution.
 */
describe("TEST Sandbox wisselplan scenarios", () => {
  const kickoff = [
    player("test-1", "Test Keeper", true, 0),
    player("test-2", "Test RB", true, 1),
    player("test-3", "Test CB A", true, 2),
    player("test-4", "Test CB B", true, 3),
    player("test-5", "Test LB", true, 4),
    player("test-6", "Test CDM", true, 5),
    player("test-7", "Test CM", true, 6),
    player("test-8", "Test CAM", true, 7),
    player("test-9", "Test RW", false),
    player("test-10", "Test LW", false),
    player("test-11", "Test ST A", false),
    player("test-12", "Test ST B", false),
    player("test-13", "Test Wissel A", false),
    player("test-14", "Test Wissel B", false),
  ];

  it("prefers low-minute bench players for the first planned sub (JO13-style)", () => {
    const bench = kickoff.filter((p) => !p.onField).map((p) => String(p.playerId));
    const ordered = playersByFewestMinutes(bench);
    expect(ordered[0]).toBe("test-14");
    expect(JO13_STYLE_SEASON_MINUTES["test-14"]).toBeLessThan(
      JO13_STYLE_SEASON_MINUTES["test-9"]!
    );
  });

  it("projects a multi-step plan from kickoff", () => {
    const result = projectSubstitutionPlan(kickoff, [
      plan(0, "test-8", "test-14", { targetQuarter: 1, targetMinute: 10 }),
      plan(1, "test-7", "test-13", { targetQuarter: 1, targetMinute: 15 }),
    ]);

    expect(result.warnings).toEqual([]);
    expect(names(result.projectedOnField)).toContain("Test Wissel A");
    expect(names(result.projectedOnField)).toContain("Test Wissel B");
    expect(names(result.projectedBench)).toContain("Test CAM");
    expect(names(result.projectedBench)).toContain("Test CM");
  });

  it("keeps planning after a live sub already moved the first pair", () => {
    // Live coach already did test-8 ↔ test-14; plan row 0 may still be pending until
    // the server marks executed — projection must no-op that row and apply the rest.
    const afterLive = kickoff.map((p) => {
      if (p.playerId === ("test-8" as Id<"players">)) {
        return { ...p, onField: false, fieldSlotIndex: undefined };
      }
      if (p.playerId === ("test-14" as Id<"players">)) {
        return { ...p, onField: true, fieldSlotIndex: 7 };
      }
      return p;
    });

    const result = projectSubstitutionPlan(afterLive, [
      plan(0, "test-8", "test-14", { targetQuarter: 1, targetMinute: 10 }),
      plan(1, "test-7", "test-13", { targetQuarter: 1, targetMinute: 15 }),
      plan(2, "test-6", "test-12", { targetQuarter: 2, targetMinute: 5 }),
    ]);

    expect(result.warnings).toEqual([]);
    expect(names(result.projectedOnField)).toContain("Test Wissel B");
    expect(names(result.projectedOnField)).toContain("Test Wissel A");
    expect(names(result.projectedOnField)).toContain("Test ST B");
    expect(names(result.projectedBench)).toContain("Test CAM");
    expect(names(result.projectedBench)).toContain("Test CM");
    expect(names(result.projectedBench)).toContain("Test CDM");
  });

  it("still plans quarter 2 after earlier live + pending rows", () => {
    const afterLive = kickoff.map((p) => {
      if (p.playerId === ("test-8" as Id<"players">)) {
        return { ...p, onField: false, fieldSlotIndex: undefined };
      }
      if (p.playerId === ("test-14" as Id<"players">)) {
        return { ...p, onField: true, fieldSlotIndex: 7 };
      }
      return p;
    });

    const result = projectSubstitutionPlan(
      afterLive,
      [
        plan(0, "test-8", "test-14", { targetQuarter: 1 }),
        plan(1, "test-7", "test-13", { targetQuarter: 1 }),
        plan(2, "test-6", "test-12", { targetQuarter: 2 }),
      ],
      2
    );

    expect(result.quarterPreview).toBeDefined();
    expect(result.quarterPreview!.warnings).toEqual([]);
    expect(names(result.quarterPreview!.projectedOnField)).toContain("Test ST B");
  });
});
