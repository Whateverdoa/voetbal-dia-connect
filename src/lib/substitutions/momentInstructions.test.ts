import { describe, expect, it } from "vitest";
import { momentInstructions } from "./momentInstructions";
import { validatePortableSubstitutionPlan, type PortableSubstitutionPlan } from "./validatePortableSubstitutionPlan";

describe("coach-facing moment instructions", () => {
  it("collapses intermediate swaps into one final destination per retained player", () => {
    const keys = ["keeper", "olivier", "miloud", "krijn", "loek", "tygo", "jody", "maceo", "max"];
    const plan: PortableSubstitutionPlan = {
      match: { regulationDurationMinutes: 60, fieldPlayerCountIncludingKeeper: 6 },
      players: keys.map((key, number) => ({ key, name: key, number })),
      formation: { slots: ["GK", "LB", "CB", "RB", "CM", "ST"].map((position, id) => ({ id, position })) },
      startingLineup: { keeperKey: "keeper", field: keys.slice(0, 6).map((playerKey, slotId) => ({ playerKey, slotId })), bench: keys.slice(6) },
      steps: [{ id: "m30", matchMinute: 30, actions: [
        { id: "a", kind: "substitution", playerOutKey: "olivier", playerInKey: "jody" },
        { id: "b", kind: "substitution", playerOutKey: "miloud", playerInKey: "maceo" },
        { id: "c", kind: "substitution", playerOutKey: "krijn", playerInKey: "max" },
        ...["jody", "maceo", "max", "tygo"].map((playerInKey, i) => ({ id: `swap${i}`, kind: "positionSwap" as const, playerOutKey: "loek", playerInKey })),
      ] }],
    };
    const report = validatePortableSubstitutionPlan(plan);
    expect(report.simulationComplete).toBe(true);
    expect(momentInstructions(plan, report.snapshots, "m30")).toEqual([
      "Wissel: olivier 1 eruit → jody 6 erin op CM",
      "Wissel: miloud 2 eruit → maceo 7 erin op LB",
      "Wissel: krijn 3 eruit → max 8 erin op CB",
      "Positie: loek 4 van CM naar ST",
      "Positie: tygo 5 van ST naar RB",
    ]);
    expect(momentInstructions(plan, report.snapshots, "missing")[0]).toContain("niet volledig");
  });
});
