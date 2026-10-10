import { describe, expect, it } from "vitest";
import { DEMO_PLAN } from "./demoPlan";
import { assignDemoStartingPlayer, createManualDemoPlan, swapDemoStartingPositions } from "./demoLineup";
import { validatePortableSubstitutionPlan } from "./validatePortableSubstitutionPlan";

describe("createManualDemoPlan", () => {
  it("preserves the edited selection and formation while removing photo substitutions and bench-minute claims", () => {
    const plan = assignDemoStartingPlayer(structuredClone(DEMO_PLAN), 6, "krijn");
    plan.players[0].name = "Tygo aangepast";
    plan.players[0].number = 21;
    plan.formation.name = "Eigen opstelling";
    plan.review = { sourceConfirmed: true, unresolved: ["Controleer naam"], integrationRequired: ["Koppel wedstrijd"] };
    const before = structuredClone(plan);
    plan.players.forEach(Object.freeze);
    Object.freeze(plan.players);
    Object.freeze(plan.steps);
    Object.freeze(plan.review);
    Object.freeze(plan);

    const manual = createManualDemoPlan(plan);
    expect(plan).toEqual(before);
    expect(manual.steps).toEqual([]);
    expect(manual.players).toEqual(before.players.map((player) => ({ ...player, sourceBenchMinutes: null })));
    expect(manual.startingLineup).toBe(plan.startingLineup);
    expect(manual.formation).toBe(plan.formation);
    expect(manual.match).toBe(plan.match);
    expect(manual.review).toEqual({ ...before.review, sourceConfirmed: false });
    expect(manual.startingLineup.field).toContainEqual({ playerKey: "krijn", slotId: 6 });
    expect(manual.startingLineup.bench).toContain("sem");
  });

  it("allows a changed bank starter to form a valid plan once photo actions have explicitly been discarded", () => {
    const changed = assignDemoStartingPlayer(DEMO_PLAN, 6, "krijn");
    expect(validatePortableSubstitutionPlan(changed).issues.some((issue) => issue.code === "OUT_NOT_ON_FIELD")).toBe(true);
    const manual = createManualDemoPlan(changed);
    const report = validatePortableSubstitutionPlan(manual);
    expect(report.structurallyValid).toBe(true);
    expect(report.simulationComplete).toBe(true);
    expect(report.totals?.playingMinutes).toBe(660);
    expect(report.readyToPublish).toBe(false);
    expect(manual.review?.sourceConfirmed).toBe(false);
  });
});

describe("swapDemoStartingPositions", () => {
  it("exchanges field roles reversibly while leaving the source and planned playing time unchanged", () => {
    const before = structuredClone(DEMO_PLAN);
    const swapped = swapDemoStartingPositions(DEMO_PLAN, "loek", "sem");

    expect(swapped.startingLineup.field).toContainEqual({ playerKey: "loek", slotId: 6 });
    expect(swapped.startingLineup.field).toContainEqual({ playerKey: "sem", slotId: 5 });
    expect(swapped.startingLineup.field).toHaveLength(11);
    expect(new Set(swapped.startingLineup.field.map((entry) => entry.slotId)).size).toBe(11);
    expect(swapped.startingLineup.keeperKey).toBe("luc");
    expect(DEMO_PLAN).toEqual(before);
    expect(swapDemoStartingPositions(swapped, "loek", "sem")).toEqual(before);

    const originalReport = validatePortableSubstitutionPlan(DEMO_PLAN);
    const swappedReport = validatePortableSubstitutionPlan(swapped);
    expect(swappedReport.structurallyValid).toBe(true);
    expect(swappedReport.simulationComplete).toBe(true);
    expect(swappedReport.minutes).toEqual(originalReport.minutes);
    expect(swappedReport.totals?.playingMinutes).toBe(660);
  });

  it.each([["luc", "loek"], ["loek", "luc"]])("updates keeper identity when swapping %s and %s", (playerA, playerB) => {
    const swapped = swapDemoStartingPositions(DEMO_PLAN, playerA, playerB);
    expect(swapped.startingLineup.keeperKey).toBe("loek");
    expect(swapped.startingLineup.field).toContainEqual({ playerKey: "loek", slotId: 0 });
    expect(swapped.startingLineup.field).toContainEqual({ playerKey: "luc", slotId: 5 });
    expect(swapped.steps).toEqual(DEMO_PLAN.steps);

    // Loek's planned substitution now needs a deliberate keeper change. Preserve that conflict for review.
    const report = validatePortableSubstitutionPlan(swapped);
    expect(report.issues.some((issue) => issue.code === "INVALID_STARTING_KEEPER")).toBe(false);
    expect(report.issues.some((issue) => issue.code === "INVALID_KEEPER_AFTER_ACTION")).toBe(true);
    expect(report.readyToPublish).toBe(false);
  });

  it("preserves edited player data, formation, bench and review notes and revokes confirmation", () => {
    const plan = structuredClone(DEMO_PLAN);
    plan.players[0].name = "Tygo aangepast";
    plan.players[0].number = 21;
    plan.formation.name = "Eigen beginopstelling";
    plan.review = { sourceConfirmed: true, unresolved: ["Controleer de rollen"], integrationRequired: ["Koppel wedstrijd"] };
    const before = structuredClone(plan);
    for (const entry of plan.startingLineup.field) Object.freeze(entry);
    Object.freeze(plan.startingLineup.field);
    Object.freeze(plan.startingLineup);
    Object.freeze(plan.review);
    Object.freeze(plan);

    const swapped = swapDemoStartingPositions(plan, "jody", "max");
    expect(plan).toEqual(before);
    expect(swapped.players).toEqual(before.players);
    expect(swapped.formation).toEqual(before.formation);
    expect(swapped.startingLineup.bench).toEqual(before.startingLineup.bench);
    expect(swapped.steps).toEqual(before.steps);
    expect(swapped.match).toEqual(before.match);
    expect(swapped.review).toEqual({ ...before.review, sourceConfirmed: false });
  });

  it.each([
    ["loek", "loek"],
    ["loek", "maceo"],
    ["lukas", "krijn"],
    ["unknown", "sem"],
    ["", "sem"],
  ])("rejects invalid selections %s / %s without modifying the plan", (playerA, playerB) => {
    const plan = structuredClone(DEMO_PLAN);
    const before = structuredClone(plan);
    expect(() => swapDemoStartingPositions(plan, playerA, playerB)).toThrow();
    expect(plan).toEqual(before);
  });

  it("rejects an absent field player without changing the plan", () => {
    const plan = structuredClone(DEMO_PLAN);
    plan.players.find((player) => player.key === "loek")!.absent = true;
    const before = structuredClone(plan);
    expect(() => swapDemoStartingPositions(plan, "loek", "sem")).toThrow("Beide spelers moeten");
    expect(plan).toEqual(before);
  });

  it("rejects ambiguous slot ownership without changing the plan", () => {
    const plan = structuredClone(DEMO_PLAN);
    plan.startingLineup.field.find((entry) => entry.playerKey === "sem")!.slotId = 5;
    const before = structuredClone(plan);
    expect(() => swapDemoStartingPositions(plan, "loek", "sem")).toThrow("geldige, verschillende veldposities");
    expect(plan).toEqual(before);
  });
});

describe("assignDemoStartingPlayer", () => {
  it("replaces a field player with a bench player and preserves the vacated bench position", () => {
    const before = structuredClone(DEMO_PLAN);
    const next = assignDemoStartingPlayer(DEMO_PLAN, 6, "krijn");
    expect(next.startingLineup.field).toContainEqual({ playerKey: "krijn", slotId: 6 });
    expect(next.startingLineup.field.some((entry) => entry.playerKey === "sem")).toBe(false);
    expect(next.startingLineup.bench).toEqual(["maceo", "sem", "lukas"]);
    expect(next.startingLineup.field).toHaveLength(11);
    expect(new Set([...next.startingLineup.field.map((entry) => entry.playerKey), ...next.startingLineup.bench]).size).toBe(14);
    expect(next.startingLineup.keeperKey).toBe("luc");
    expect(next.steps).toBe(DEMO_PLAN.steps);
    expect(DEMO_PLAN).toEqual(before);
    // The old Sem-out action is now impossible and must be reviewed; it is never silently rewritten.
    expect(validatePortableSubstitutionPlan(next).issues.some((issue) => issue.code === "OUT_NOT_ON_FIELD")).toBe(true);
  });

  it("exchanges two field positions and keeps everyone in the original field/bench groups", () => {
    const next = assignDemoStartingPlayer(DEMO_PLAN, 5, "sem");
    expect(next.startingLineup.field).toContainEqual({ playerKey: "sem", slotId: 5 });
    expect(next.startingLineup.field).toContainEqual({ playerKey: "loek", slotId: 6 });
    expect(next.startingLineup.bench).toEqual(DEMO_PLAN.startingLineup.bench);
    expect(next.startingLineup.field.map((entry) => entry.playerKey).sort()).toEqual(DEMO_PLAN.startingLineup.field.map((entry) => entry.playerKey).sort());
    expect(next.steps).toBe(DEMO_PLAN.steps);
  });

  it("assigns a bench player as keeper and can exchange the current keeper with an outfield player", () => {
    const fromBench = assignDemoStartingPlayer(DEMO_PLAN, 0, "lukas");
    expect(fromBench.startingLineup.keeperKey).toBe("lukas");
    expect(fromBench.startingLineup.field).toContainEqual({ playerKey: "lukas", slotId: 0 });
    expect(fromBench.startingLineup.bench).toEqual(["maceo", "krijn", "luc"]);
    const outfield = assignDemoStartingPlayer(fromBench, 5, "lukas");
    expect(outfield.startingLineup.keeperKey).toBe("loek");
    expect(outfield.startingLineup.field).toContainEqual({ playerKey: "loek", slotId: 0 });
    expect(outfield.startingLineup.field).toContainEqual({ playerKey: "lukas", slotId: 5 });
    expect(outfield.steps).toBe(DEMO_PLAN.steps);
  });

  it("revokes confirmation without mutating a frozen source or changing future actions and review notes", () => {
    const plan = structuredClone(DEMO_PLAN);
    plan.review = { sourceConfirmed: true, unresolved: ["Controleer de namen"] };
    const before = structuredClone(plan);
    plan.startingLineup.field.forEach(Object.freeze);
    Object.freeze(plan.startingLineup.field);
    Object.freeze(plan.startingLineup.bench);
    Object.freeze(plan.startingLineup);
    Object.freeze(plan.review);
    Object.freeze(plan);
    const next = assignDemoStartingPlayer(plan, 8, "maceo");
    expect(plan).toEqual(before);
    expect(next.review).toEqual({ ...before.review, sourceConfirmed: false });
    expect(next.players).toBe(plan.players);
    expect(next.steps).toBe(plan.steps);
    expect(next.formation).toBe(plan.formation);
    expect(next.match).toBe(plan.match);
  });

  it("treats selecting the current occupant as a no-op", () => {
    const plan = structuredClone(DEMO_PLAN);
    plan.review = { sourceConfirmed: true };
    expect(assignDemoStartingPlayer(plan, 6, "sem")).toBe(plan);
    expect(plan.review.sourceConfirmed).toBe(true);
  });

  it("rejects an absent player even when that player belongs to the wider roster", () => {
    const plan = structuredClone(DEMO_PLAN);
    plan.players.push({ key: "absent", name: "Afwezig", number: 21, absent: true });
    const before = structuredClone(plan);
    expect(() => assignDemoStartingPlayer(plan, 6, "absent")).toThrow("aanwezige speler");
    expect(plan).toEqual(before);
  });

  it.each([[99, "sem"], [1.5, "sem"], [6, "unknown"], [6, ""]] as const)("rejects invalid slot/player %s/%s without changing the source", (slot, player) => {
    const plan = structuredClone(DEMO_PLAN);
    const before = structuredClone(plan);
    expect(() => assignDemoStartingPlayer(plan, slot, player)).toThrow();
    expect(plan).toEqual(before);
  });

  it("rejects ambiguous or incomplete starting state rather than introducing duplicate players", () => {
    const duplicatePlayer = structuredClone(DEMO_PLAN);
    duplicatePlayer.startingLineup.bench.push("luc");
    const duplicateSlot = structuredClone(DEMO_PLAN);
    duplicateSlot.startingLineup.field[1].slotId = 2;
    const absentOnBench = structuredClone(DEMO_PLAN);
    absentOnBench.players.find((player) => player.key === "maceo")!.absent = true;
    const missingPlayer = structuredClone(DEMO_PLAN);
    missingPlayer.startingLineup.bench.pop();
    for (const plan of [duplicatePlayer, duplicateSlot, absentOnBench, missingPlayer]) {
      const before = structuredClone(plan);
      expect(() => assignDemoStartingPlayer(plan, 6, "krijn")).toThrow();
      expect(plan).toEqual(before);
    }
  });
});
