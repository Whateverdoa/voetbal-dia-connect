import { describe, expect, it } from "vitest";
import { DEMO_PLAN } from "./demoPlan";
import {
  DEFAULT_DEMO_FORMATION_ID,
  DEMO_FORMATIONS,
  getDemoFormation,
  withDemoFormation,
} from "./demoFormations";
import { validatePortableSubstitutionPlan } from "./validatePortableSubstitutionPlan";

describe("demo formations", () => {
  it("preserves the transcribed formation exactly and falls back to it for unknown choices", () => {
    expect(getDemoFormation(DEFAULT_DEMO_FORMATION_ID).slots).toEqual(DEMO_PLAN.formation.slots);
    expect(getDemoFormation(undefined).id).toBe(DEFAULT_DEMO_FORMATION_ID);
    expect(getDemoFormation("unknown").id).toBe(DEFAULT_DEMO_FORMATION_ID);
  });

  it.each(DEMO_FORMATIONS)("keeps $name playable with 11 distinct slots and safe half-pitch coordinates", (formation) => {
    expect(formation.slots).toHaveLength(11);
    expect(formation.slots.map((slot) => slot.id)).toEqual(Array.from({ length: 11 }, (_, id) => id));
    expect(formation.slots.filter((slot) => slot.position === "GK")).toEqual([
      expect.objectContaining({ id: 0, x: 50 }),
    ]);
    for (const slot of formation.slots) {
      expect(slot.x).toBeGreaterThanOrEqual(12);
      expect(slot.x).toBeLessThanOrEqual(88);
      expect(slot.y).toBeGreaterThanOrEqual(12);
      expect(slot.y).toBeLessThanOrEqual(slot.id === 0 ? 91 : 88);
    }
    // Slot IDs progress from the defensive line to attack, left to right within a line.
    for (let index = 2; index < formation.slots.length; index += 1) {
      const previous = formation.slots[index - 1];
      const current = formation.slots[index];
      expect(current.y).toBeLessThanOrEqual(previous.y);
      if (current.y === previous.y) expect(current.x).toBeGreaterThan(previous.x);
    }
  });

  it("retains left and right role labels when converting the app's opposite slot order", () => {
    const formation = getDemoFormation("4-4-2");
    expect(formation.slots[1]).toMatchObject({ position: "LB", x: 14 });
    expect(formation.slots[4]).toMatchObject({ position: "RB", x: 86 });
    expect(formation.slots[5]).toMatchObject({ position: "LM", x: 14 });
    expect(formation.slots[8]).toMatchObject({ position: "RM", x: 86 });
  });

  it("arranges 3-4-3 as a midfield diamond between three defenders and three attackers", () => {
    const formation = getDemoFormation("3-4-3");
    expect(formation.name).toBe("3-4-3 (ruit)");
    expect(formation.slots.slice(4, 8)).toEqual([
      { id: 4, position: "CDM", x: 50, y: 60 },
      { id: 5, position: "LM", x: 22, y: 44 },
      { id: 6, position: "RM", x: 78, y: 44 },
      { id: 7, position: "CAM", x: 50, y: 28 },
    ]);
    expect(formation.slots[0]).toEqual({ id: 0, position: "GK", x: 50, y: 91 });
    expect(formation.slots.slice(1, 4).map(({ position, x, y }) => [position, x, y])).toEqual([
      ["CB", 20, 76], ["CB", 50, 76], ["CB", 80, 76],
    ]);
    expect(formation.slots.slice(8).map(({ position, x, y }) => [position, x, y])).toEqual([
      ["LW", 20, 12], ["ST", 50, 12], ["RW", 80, 12],
    ]);
  });

  it.each(DEMO_FORMATIONS)("replays the same source substitutions and minutes for $name", (formation) => {
    const original = validatePortableSubstitutionPlan(DEMO_PLAN);
    const updated = withDemoFormation(DEMO_PLAN, formation.id);
    const report = validatePortableSubstitutionPlan(updated);
    expect(report.structurallyValid).toBe(true);
    expect(report.simulationComplete).toBe(true);
    expect(report.issues.filter((issue) => issue.severity === "error")).toEqual([]);
    expect(report.snapshots).toEqual(original.snapshots);
    expect(report.minutes).toEqual(original.minutes);
    expect(report.totals).toEqual(original.totals);
    expect(report.totals?.playingMinutes).toBe(660);
    expect(report.sourceChecks).toEqual(original.sourceChecks);
    expect(updated.startingLineup.keeperKey).toBe("luc");
    expect(updated.startingLineup.field.find((entry) => entry.playerKey === "luc")?.slotId).toBe(0);
    expect(report.readyToPublish).toBe(false);
    expect(report.sourceConfirmed).toBe(false);
  });

  it("preserves edited names, numbers, unresolved checks and source data without mutating input", () => {
    const plan = structuredClone(DEMO_PLAN);
    plan.players[0].name = "Tygo aangepast";
    plan.players[0].number = 21;
    plan.review = { sourceConfirmed: true, unresolved: ["Controleer de nieuwe posities"] };
    const before = structuredClone(plan);
    Object.freeze(plan.formation);
    Object.freeze(plan.review);
    Object.freeze(plan);

    const updated = withDemoFormation(plan, "4-4-2");
    expect(plan).toEqual(before);
    expect(updated.players).toEqual(before.players);
    expect(updated.steps).toEqual(before.steps);
    expect(updated.startingLineup).toEqual(before.startingLineup);
    expect(updated.match).toEqual(before.match);
    expect(updated.review).toEqual({ sourceConfirmed: false, unresolved: ["Controleer de nieuwe posities"] });

    updated.formation.slots[1].x = 99;
    expect(getDemoFormation("4-4-2").slots[1].x).toBe(14);
    expect(plan.formation.slots[1].x).toBe(14);
  });
});
