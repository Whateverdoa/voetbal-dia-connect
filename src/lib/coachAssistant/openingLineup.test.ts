import { describe, expect, it } from "vitest";
import { planFromOpeningLineup, openingActionIds, type PlanTiming } from "./openingLineup";
import type { DemoPlan } from "../substitutions/demoPlan";
import { validatePortableSubstitutionPlan } from "../substitutions/validatePortableSubstitutionPlan";

export function openingFixture() {
  const plan: DemoPlan = {
    match: { regulationDurationMinutes: 60, fieldPlayerCountIncludingKeeper: 4, halftimeAtMinute: 30 },
    formation: { slots: ["GK", "CB", "CM", "ST"].map((position, id) => ({ id, position, x: 50, y: id * 20 })) },
    players: ["Keeper", "Max", "Sem", "Miloud", "Maceo", "Loek"].map((key) => ({ key, name: key })),
    startingLineup: { keeperKey: "Keeper", field: ["Keeper", "Max", "Sem", "Miloud"].map((playerKey, slotId) => ({ playerKey, slotId })), bench: ["Maceo", "Loek"] },
    steps: [
      { id: "minute-1", matchMinute: 1, actions: [
        { id: "opening", kind: "substitution", playerOutKey: "Sem", playerInKey: "Maceo" },
        { id: "opening-swap", kind: "positionSwap", playerOutKey: "Maceo", playerInKey: "Miloud" },
        { id: "h2-swap", kind: "positionSwap", playerOutKey: "Maceo", playerInKey: "Miloud" },
        { id: "max-swap", kind: "positionSwap", playerOutKey: "Max", playerInKey: "Miloud" },
      ] },
      { id: "minute-20", matchMinute: 20, actions: [{ id: "out", kind: "substitution", playerOutKey: "Max", playerInKey: "Loek" }] },
      { id: "minute-40", matchMinute: 40, actions: [{ id: "in", kind: "substitution", playerOutKey: "Loek", playerInKey: "Max" }] },
    ],
  };
  const timing: PlanTiming[] = [
    { id: "opening", quarter: 1, minute: 1 }, { id: "opening-swap", quarter: 1, minute: 1 },
    { id: "h2-swap", quarter: 2, minute: 1 }, { id: "max-swap", quarter: 2, minute: 1 },
    { id: "out", quarter: 1, minute: 20 }, { id: "in", quarter: 2, minute: 40 },
  ];
  return { plan, timing };
}

describe("start from the first-minute lineup", () => {
  it("keeps H2 swaps in H2 and applies a moved swap after the player returns", () => {
    const { plan, timing } = openingFixture(); const original = structuredClone(plan);
    expect(openingActionIds(timing)).toEqual(["opening", "opening-swap"]);
    const result = planFromOpeningLineup(plan, timing, 2, { "max-swap": 40 });
    expect(result.error).toBeUndefined();
    const next = result.plan!;
    expect(next.startingLineup.field).toContainEqual({ playerKey: "Maceo", slotId: 3 });
    expect(next.startingLineup.bench).toContain("Sem");
    expect(next.steps.map((step) => step.matchMinute)).toEqual([20, 31, 40]);
    expect(next.steps[2].actions.map((action) => action.id)).toEqual(["in", "max-swap"]);
    const report = validatePortableSubstitutionPlan(next);
    expect(report.simulationComplete).toBe(true);
    expect(report.minutes.byPlayer.find((player) => player.playerKey === "Maceo")?.playingMinutes).toBe(60);
    expect(plan).toEqual(original);
  });
  it("leaves a later conflict visible instead of inventing a change to the coach plan", () => {
    const { plan, timing } = openingFixture();
    const result = planFromOpeningLineup(plan, timing, 2);
    expect(result.plan).toBeDefined();
    expect(validatePortableSubstitutionPlan(result.plan!).simulationComplete).toBe(false);
  });
  it("rejects an invalid opening group and an invalid moved minute without changing the source", () => {
    const { plan, timing } = openingFixture(); const original = structuredClone(plan);
    expect(planFromOpeningLineup(plan, timing, 2, { "max-swap": NaN }).error).toBeTruthy();
    expect(planFromOpeningLineup(plan, timing, 2, { "max-swap": 10 }).error).toContain("gekozen helft");
    plan.steps[0].actions[0].playerInKey = "Max";
    expect(planFromOpeningLineup(plan, timing, 2).error).toBeTruthy();
    expect(original.startingLineup).toEqual(plan.startingLineup);
  });
});
