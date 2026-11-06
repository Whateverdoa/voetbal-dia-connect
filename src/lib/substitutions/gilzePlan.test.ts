import { describe, expect, it } from "vitest";
import { F11_1352 } from "@/lib/formations";
import { GILZE_IMPORTED_PLAN, GILZE_PLAN, GILZE_SOURCE_DETAILS } from "./gilzePlan";
import { advanceDemoClock, createDemoMatch, executeDemoStep, getDemoComparison, startDemoClock } from "./demoMatch";
import { validatePortableSubstitutionPlan } from "./validatePortableSubstitutionPlan";

describe("Gilze coach-plan snapshot", () => {
  it("preserves the imported selection while locally excluding the injured player from all available positions", () => {
    const report = validatePortableSubstitutionPlan(GILZE_PLAN);
    expect(report.structurallyValid).toBe(true);
    expect(report.simulationComplete).toBe(true);
    expect(report.readyToPublish).toBe(false);
    expect(GILZE_PLAN.formation.slots.map(({ id, position }) => ({ id, position })))
      .toEqual(F11_1352.slots.map(({ id, position }) => ({ id, position })));
    const label = (key: string) => {
      const player = GILZE_PLAN.players.find((candidate) => candidate.key === key)!;
      return `${player.name} ${player.number}`;
    };
    expect(GILZE_PLAN.startingLineup.field.map(({ slotId, playerKey }) => [slotId, label(playerKey)]))
      .toEqual([[0, "Luc 1"], [1, "Olivier 9"], [2, "Krijn 10"], [3, "Jody 2"], [4, "Maceo 16"],
        [5, "Max 18"], [6, "Loek 17"], [7, "Sem 15"], [8, "Tygo 11"], [9, "Miloud 8"], [10, "Lukas 14"]]);
    expect(GILZE_PLAN.startingLineup.bench.map(label)).toEqual(["Revi 5", "Lucas 7", "Matteo 3"]);
    expect(GILZE_PLAN.players).toHaveLength(15);
    expect(GILZE_PLAN.players.filter((player) => !player.absent)).toHaveLength(14);
    expect(GILZE_PLAN.players.find((player) => player.name === "Luuk"))
      .toMatchObject({ key: "gilze-p07", number: 4, absent: true, unavailableReason: "injured" });
    expect(GILZE_IMPORTED_PLAN.players.find((player) => player.name === "Luuk"))
      .toMatchObject({ key: "gilze-p07", number: 4, absent: false });
    expect(GILZE_IMPORTED_PLAN.startingLineup.bench.map(label)).toEqual(["Revi 5", "Luuk 4", "Lucas 7", "Matteo 3"]);
    expect(GILZE_PLAN.steps).toEqual(GILZE_IMPORTED_PLAN.steps);
    expect(GILZE_PLAN.startingLineup.field).toEqual(GILZE_IMPORTED_PLAN.startingLineup.field);
    expect(GILZE_SOURCE_DETAILS.notes.join(" ")).toMatch(/2 oktober/);
    expect(GILZE_SOURCE_DETAILS.notes.join(" ")).toMatch(/geblesseerd/i);
    expect(report.minutes.byPlayer).toHaveLength(14);
    expect(report.minutes.byPlayer.some((player) => player.playerKey === "gilze-p07")).toBe(false);
    expect(report.totals).toMatchObject({ playingMinutes: 660, benchMinutes: 180, expectedPlayingMinutes: 660, expectedBenchMinutes: 180 });
    expect(report.distribution).toMatchObject({ minimumPlayingMinutes: 40, maximumPlayingMinutes: 50 });
    // App slot numbering runs right-to-left; it must not inherit the photo's reversed IDs.
    expect(GILZE_PLAN.formation.slots.find((slot) => slot.id === 1)!.x).toBeGreaterThan(50);
    expect(GILZE_PLAN.formation.slots.find((slot) => slot.id === 3)!.x).toBeLessThan(50);
  });

  it("executes dependent position changes in source order and conserves all nominal minutes", () => {
    const before = structuredClone(GILZE_PLAN);
    const importedBefore = structuredClone(GILZE_IMPORTED_PLAN);
    expect(GILZE_PLAN.steps.map((step) => step.matchMinute)).toEqual([10, 20, 30, 40, 50]);
    let match = createDemoMatch(GILZE_PLAN);
    for (const step of GILZE_PLAN.steps) {
      match = advanceDemoClock(startDemoClock(match), step.matchMinute * 60 - match.elapsedSeconds);
      match = executeDemoStep(match, step.id);
      expect(match.field).toHaveLength(11);
      expect(match.bench).toHaveLength(3);
      expect(new Set([...match.field.map((entry) => entry.playerKey), ...match.bench]).size).toBe(14);
      expect(match.bench).not.toContain("gilze-p07");
    }
    match = advanceDemoClock(startDemoClock(match), 60 * 60 - match.elapsedSeconds);
    const rows = getDemoComparison(match);
    expect(match.phase).toBe("finished");
    expect(match.completedActionIds).toHaveLength(14);
    expect(Object.fromEntries(rows.map((row) => [row.name, row.actualMinutes]))).toEqual({
      Luc: 60, Jody: 50, Matteo: 50, Revi: 40, Lucas: 50, Miloud: 40, Olivier: 50,
      Krijn: 50, Tygo: 40, Lukas: 40, Sem: 50, Maceo: 50, Loek: 40, Max: 50,
    });
    expect(rows.every((row) => row.deltaMinutes === 0)).toBe(true);
    expect(rows.reduce((total, row) => total + row.actualMinutes, 0)).toBe(660);
    expect(rows).toHaveLength(14);
    expect(rows.some((row) => row.name === "Luuk")).toBe(false);
    expect(rows.reduce((total, row) => total + row.actualBenchMinutes, 0)).toBe(180);
    expect(GILZE_PLAN).toEqual(before);
    expect(GILZE_IMPORTED_PLAN).toEqual(importedBefore);
  });
});
