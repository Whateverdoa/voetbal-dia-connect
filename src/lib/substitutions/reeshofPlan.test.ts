import { describe, expect, it } from "vitest";
import { F11_1433 } from "@/lib/formations";
import { REESHOF_IMPORTED_PLAN, REESHOF_PLAN, REESHOF_SOURCE_DETAILS } from "./reeshofPlan";
import { advanceDemoClock, createDemoMatch, executeDemoStep, getDemoComparison, startDemoClock } from "./demoMatch";
import { validatePortableSubstitutionPlan } from "./validatePortableSubstitutionPlan";

const expectedSelection = [
  ["Jody", 2], ["Loek", 17], ["Luc", 1], ["Revi", 5], ["Lukas", 14], ["Miloud", 8], ["Luuk", 4],
  ["Sem", 15], ["Tygo", 11], ["Olivier", 9], ["Krijn", 10], ["Lucas", 7], ["Maceo", 16], ["Max", 18], ["Matteo", 3],
];

const label = (key: string) => {
  const player = REESHOF_PLAN.players.find((candidate) => candidate.key === key);
  if (!player) throw new Error(`Onbekende speler ${key}`);
  return `${player.name} ${player.number}`;
};

describe("Reeshof coach-plan snapshot", () => {
  it("preserves the coach selection and slot identities while excluding only unavailable Luuk locally", () => {
    const report = validatePortableSubstitutionPlan(REESHOF_PLAN);
    expect(report.structurallyValid).toBe(true);
    expect(report.simulationComplete).toBe(true);
    expect(report.readyToPublish).toBe(false);
    expect(REESHOF_PLAN.review?.sourceConfirmed).toBe(false);
    expect(REESHOF_IMPORTED_PLAN.review?.sourceConfirmed).toBe(false);
    expect(REESHOF_IMPORTED_PLAN.players.map(({ name, number }) => [name, number])).toEqual(expectedSelection);
    expect(REESHOF_PLAN.players.map(({ key }) => key))
      .toEqual(expectedSelection.map((_, index) => `reeshof-p${String(index + 1).padStart(2, "0")}`));
    expect(REESHOF_PLAN.formation).toMatchObject({ id: "app-reeshof-4-3-3", name: "4-3-3 (opstelling coach)" });
    expect(REESHOF_PLAN.formation.slots.map(({ id, position }) => ({ id, position })))
      .toEqual(F11_1433.slots.map(({ id, position }) => ({ id, position })));
    expect(REESHOF_PLAN.startingLineup.field.map(({ slotId, playerKey }) => [slotId, label(playerKey)]))
      .toEqual([[0, "Luc 1"], [1, "Maceo 16"], [2, "Olivier 9"], [3, "Max 18"], [4, "Jody 2"],
        [5, "Sem 15"], [6, "Loek 17"], [7, "Krijn 10"], [8, "Miloud 8"], [9, "Lukas 14"], [10, "Tygo 11"]]);
    expect(REESHOF_PLAN.startingLineup.keeperKey).toBe("reeshof-p03");
    expect(REESHOF_PLAN.startingLineup.bench.map(label)).toEqual(["Revi 5", "Lucas 7", "Matteo 3"]);
    expect(REESHOF_IMPORTED_PLAN.startingLineup.bench.map(label)).toEqual(["Revi 5", "Luuk 4", "Lucas 7", "Matteo 3"]);
    expect(REESHOF_PLAN.players.filter((player) => player.absent))
      .toEqual([expect.objectContaining({ key: "reeshof-p07", name: "Luuk", number: 4, absent: true })]);
    expect(REESHOF_IMPORTED_PLAN.players.find((player) => player.key === "reeshof-p07"))
      .toMatchObject({ name: "Luuk", absent: false });
    expect(REESHOF_PLAN.players.find((player) => player.key === "reeshof-p07")?.unavailableReason).toBeUndefined();
    expect(REESHOF_PLAN.players.find((player) => player.key === "reeshof-p11"))
      .toMatchObject({ name: "Krijn", number: 10, absent: false });
    expect(REESHOF_PLAN.steps).toEqual(REESHOF_IMPORTED_PLAN.steps);
    expect(REESHOF_PLAN.startingLineup.field).toEqual(REESHOF_IMPORTED_PLAN.startingLineup.field);
    expect(REESHOF_PLAN.players.filter((player) => player.key !== "reeshof-p07"))
      .toEqual(REESHOF_IMPORTED_PLAN.players.filter((player) => player.key !== "reeshof-p07"));
    // Coach slot IDs run right-to-left; photo formation IDs must not mirror this lineup.
    expect(REESHOF_PLAN.formation.slots.find((slot) => slot.id === 1)!.x).toBeGreaterThan(50);
    expect(REESHOF_PLAN.formation.slots.find((slot) => slot.id === 4)!.x).toBeLessThan(50);
    expect(report.minutes.byPlayer).toHaveLength(14);
    expect(report.minutes.byPlayer.some((player) => player.playerKey === "reeshof-p07")).toBe(false);
    expect(report.totals).toMatchObject({ playingMinutes: 660, benchMinutes: 180, expectedPlayingMinutes: 660, expectedBenchMinutes: 180 });
  });

  it("preserves every source action but groups the later-added forty-minute swap before minute fifty", () => {
    const actions = REESHOF_IMPORTED_PLAN.steps.flatMap((step) => step.actions.map((action) => [
      step.matchMinute, action.id, action.kind, label(action.playerOutKey), label(action.playerInKey),
    ]));
    // These expectations are taken from the captured source, independently of the importer.
    expect(actions).toEqual([
      [10, "reeshof-action-0", "substitution", "Tygo 11", "Lucas 7"],
      [10, "reeshof-action-1", "substitution", "Olivier 9", "Revi 5"],
      [10, "reeshof-action-2", "positionSwap", "Krijn 10", "Revi 5"],
      [20, "reeshof-action-3", "substitution", "Jody 2", "Matteo 3"],
      [20, "reeshof-action-4", "substitution", "Lukas 14", "Tygo 11"],
      [20, "reeshof-action-5", "positionSwap", "Tygo 11", "Lucas 7"],
      [30, "reeshof-action-6", "substitution", "Max 18", "Olivier 9"],
      [30, "reeshof-action-7", "substitution", "Sem 15", "Lukas 14"],
      [40, "reeshof-action-8", "substitution", "Maceo 16", "Jody 2"],
      [40, "reeshof-action-9", "substitution", "Miloud 8", "Sem 15"],
      [40, "reeshof-action-10", "positionSwap", "Sem 15", "Revi 5"],
      [40, "reeshof-action-11", "positionSwap", "Lukas 14", "Lucas 7"],
      [40, "reeshof-action-12", "positionSwap", "Sem 15", "Lucas 7"],
      [40, "reeshof-action-14", "positionSwap", "Olivier 9", "Jody 2"],
      [50, "reeshof-action-13", "substitution", "Loek 17", "Max 18"],
    ]);
    expect(REESHOF_SOURCE_DETAILS).toMatchObject({ id: "reeshof-2026-10-10", kind: "app", teamName: "DIA JO13-2" });
    expect(REESHOF_SOURCE_DETAILS.matchLabel).toMatch(/SV Reeshof O13-1.*10 oktober 2026/);
    const notes = REESHOF_SOURCE_DETAILS.notes.join(" ");
    expect(notes).toMatch(/Luuk 4 niet/i);
    expect(notes).toMatch(/Krijn.*beschikbaar/i);
    expect(notes).toMatch(/keeper/i);
    expect(notes).toMatch(/Luc/);
    expect(notes).toMatch(/40/);
    expect(notes).toMatch(/50/);
  });

  it("replays all fifteen actions to the expected positions and minutes without changing either source plan", () => {
    const importedBefore = structuredClone(REESHOF_IMPORTED_PLAN);
    const localBefore = structuredClone(REESHOF_PLAN);
    expect(REESHOF_PLAN.steps.map((step) => step.matchMinute)).toEqual([10, 20, 30, 40, 50]);
    let match = createDemoMatch(REESHOF_PLAN);
    for (const step of REESHOF_PLAN.steps) {
      match = advanceDemoClock(startDemoClock(match), step.matchMinute * 60 - match.elapsedSeconds);
      match = executeDemoStep(match, step.id);
      expect(match.field).toHaveLength(11);
      expect(match.bench).toHaveLength(3);
      expect(new Set([...match.field.map((entry) => entry.playerKey), ...match.bench]).size).toBe(14);
      expect(match.bench).not.toContain("reeshof-p07");
      expect(match.keeperKey).toBe("reeshof-p03");
      if (step.matchMinute === 40) {
        expect(match.field.find((entry) => entry.playerKey === "reeshof-p01")?.slotId).toBe(3);
        expect(match.field.find((entry) => entry.playerKey === "reeshof-p10")?.slotId).toBe(1);
      }
    }
    expect([...match.field].sort((a, b) => a.slotId - b.slotId).map(({ slotId, playerKey }) => [slotId, label(playerKey)]))
      .toEqual([[0, "Luc 1"], [1, "Olivier 9"], [2, "Krijn 10"], [3, "Jody 2"], [4, "Matteo 3"],
        [5, "Sem 15"], [6, "Max 18"], [7, "Lucas 7"], [8, "Revi 5"], [9, "Lukas 14"], [10, "Tygo 11"]]);
    match = advanceDemoClock(startDemoClock(match), 60 * 60 - match.elapsedSeconds);
    const rows = getDemoComparison(match);
    expect(match.phase).toBe("finished");
    expect(match.completedActionIds).toHaveLength(15);
    expect(Object.fromEntries(rows.map((row) => [row.name, row.actualMinutes]))).toEqual({
      Jody: 40, Loek: 50, Luc: 60, Revi: 50, Lukas: 50, Miloud: 40, Sem: 50,
      Tygo: 50, Olivier: 40, Krijn: 60, Lucas: 50, Maceo: 40, Max: 40, Matteo: 40,
    });
    expect(rows.every((row) => row.deltaMinutes === 0)).toBe(true);
    expect(rows.reduce((total, row) => total + row.actualMinutes, 0)).toBe(660);
    expect(rows.reduce((total, row) => total + row.actualBenchMinutes, 0)).toBe(180);
    expect(rows.some((row) => row.name === "Luuk")).toBe(false);
    expect(REESHOF_IMPORTED_PLAN).toEqual(importedBefore);
    expect(REESHOF_PLAN).toEqual(localBefore);
  });
});
