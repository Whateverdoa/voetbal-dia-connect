import { describe, expect, it } from "vitest";
import {
  advanceDemoClock,
  advanceDemoClockFollowingPlan,
  changeDemoFormation,
  createDemoMatch,
  executeDemoAction,
  executeDemoStep,
  getDemoComparison,
  pauseDemoClock,
  skipDemoStep,
  startDemoClock,
  substituteDemoPlayer,
  swapDemoPlayerPositions,
  type DemoMatchState,
  type DemoFormationState,
} from "./demoMatch";
import { REESHOF_PLAN } from "./reeshofPlan";
import type { PortableSubstitutionPlan } from "./validatePortableSubstitutionPlan";

/** The photographed example, without external files, application IDs, or unverified source totals. */
function fixture(): PortableSubstitutionPlan {
  const names = ["Luc", "Jody", "Max", "Matteo", "Olivier", "Loek", "Sem", "Miloud", "Tygo", "Lucas", "Revi", "Macéo", "Krijn", "Lukas"];
  const keys = ["luc", "jody", "max", "matteo", "olivier", "loek", "sem", "milad", "tygo", "lucas", "revi", "maceo", "krijn", "lukas"];
  const numbers = [1, 2, 18, 3, 9, 17, 15, 8, 11, 7, 5, 16, 10, 14];
  const substitutions = (minute: number, pairs: string[][]): PortableSubstitutionPlan["steps"][number] => ({
    id: `m${minute}`, matchMinute: minute,
    actions: pairs.map(([playerOutKey, playerInKey], index) => ({
      id: `m${minute}-${index}`, kind: "substitution", playerOutKey, playerInKey,
    })),
  });
  const steps = [
    substitutions(10, [["revi", "maceo"], ["sem", "krijn"]]),
    substitutions(20, [["loek", "sem"], ["milad", "revi"], ["lucas", "lukas"]]),
    substitutions(30, [["max", "loek"], ["jody", "milad"]]),
    substitutions(40, [["matteo", "lucas"], ["olivier", "jody"]]),
    substitutions(50, [["tygo", "max"], ["krijn", "olivier"], ["lukas", "matteo"]]),
  ];
  steps[4].actions.push({ id: "m50-position", kind: "positionSwap", playerOutKey: "sem", playerInKey: "olivier" });
  return {
    format: "dia-substitution-plan", version: 1,
    match: { regulationDurationMinutes: 60, halftimeAtMinute: 30, fieldPlayerCountIncludingKeeper: 11 },
    players: keys.map((key, index) => ({ key, name: names[index], number: numbers[index] })),
    formation: { slots: ["GK", "LB", "LCB", "RCB", "RB", "LM", "CM", "RM", "LW", "ST", "RW"].map((position, id) => ({ id, position })) },
    startingLineup: {
      keeperKey: "luc", field: keys.slice(0, 11).map((playerKey, slotId) => ({ playerKey, slotId })),
      bench: keys.slice(11),
    },
    steps,
    review: { sourceConfirmed: false, unresolved: [] },
  };
}

function running(): DemoMatchState {
  return startDemoClock(createDemoMatch(fixture()));
}

function finishAccordingToPlan(): DemoMatchState {
  let state = running();
  for (const minute of [10, 20, 30, 40, 50]) {
    state = advanceDemoClock(state, minute * 60 - state.elapsedSeconds);
    state = executeDemoStep(state, `m${minute}`);
    if (state.phase === "halftime") state = startDemoClock(state);
  }
  return advanceDemoClock(state, 10 * 60);
}

describe("automatic plan playback", () => {
  it("replays Reeshof through two halves with all fifteen actions and the planned playing minutes", () => {
    const original = structuredClone(REESHOF_PLAN);
    const firstHalf = advanceDemoClockFollowingPlan(startDemoClock(createDemoMatch(REESHOF_PLAN)), 3600);
    expect(firstHalf.error).toBeNull();
    expect(firstHalf.match).toMatchObject({ phase: "halftime", elapsedSeconds: 1800, halftimeTaken: true });
    expect(firstHalf.match.events.map((event) => event.elapsedSeconds)).toEqual([600, 1200, 1800]);
    expect(firstHalf.match.completedActionIds).toHaveLength(8);
    expect(advanceDemoClockFollowingPlan(firstHalf.match, 3600).match).toBe(firstHalf.match);

    const secondHalf = advanceDemoClockFollowingPlan(startDemoClock(firstHalf.match), 3600);
    expect(secondHalf.error).toBeNull();
    expect(secondHalf.match).toMatchObject({ phase: "finished", elapsedSeconds: 3600 });
    expect(secondHalf.match.events.map((event) => event.elapsedSeconds)).toEqual([600, 1200, 1800, 2400, 3000]);
    expect(secondHalf.match.completedActionIds).toHaveLength(15);
    expect(Object.values(secondHalf.match.stepStatus).every((status) => status === "executed")).toBe(true);
    expect([...secondHalf.match.field].sort((a, b) => a.slotId - b.slotId).map((entry) => entry.playerKey))
      .toEqual(["reeshof-p03", "reeshof-p10", "reeshof-p11", "reeshof-p01", "reeshof-p15",
        "reeshof-p08", "reeshof-p14", "reeshof-p12", "reeshof-p04", "reeshof-p05", "reeshof-p09"]);
    const rows = getDemoComparison(secondHalf.match);
    expect(Object.fromEntries(rows.map((row) => [row.name, row.actualMinutes]))).toEqual({
      Jody: 40, Loek: 50, Luc: 60, Revi: 50, Lukas: 50, Miloud: 40, Sem: 50,
      Tygo: 50, Olivier: 40, Krijn: 60, Lucas: 50, Maceo: 40, Max: 40, Matteo: 40,
    });
    expect(rows.every((row) => row.deltaMinutes === 0 && row.finalDeltaMinutes === 0)).toBe(true);
    expect(rows.reduce((sum, row) => sum + row.actualMinutes, 0)).toBe(660);
    expect(rows.reduce((sum, row) => sum + row.actualBenchMinutes, 0)).toBe(180);
    expect(REESHOF_PLAN).toEqual(original);
  });

  it("splits a large tick at every action time, including the exact boundary", () => {
    const before = advanceDemoClockFollowingPlan(running(), 599).match;
    expect(before.events).toHaveLength(0);
    const at = advanceDemoClockFollowingPlan(before, 1);
    expect(at.error).toBeNull();
    expect(at.match.events[0]).toMatchObject({ elapsedSeconds: 600, stepId: "m10" });
    expect(at.match.secondsPlayed.maceo).toBe(0);
    const after = advanceDemoClockFollowingPlan(at.match, 15 * 60).match;
    expect(after.events.map((event) => event.elapsedSeconds)).toEqual([600, 1200]);
    expect(after.elapsedSeconds).toBe(1500);
    expect(after.secondsPlayed.revi).toBe(15 * 60);
    expect(after.secondsPlayed.maceo).toBe(15 * 60);
    expect(after.secondsPlayed.sem).toBe(15 * 60);
    expect(after.secondsPlayed.krijn).toBe(15 * 60);
  });

  it("finishes a partially executed step without repeating its completed action", () => {
    const partial = executeDemoAction(advanceDemoClock(running(), 9 * 60), "m10", "m10-0");
    const result = advanceDemoClockFollowingPlan(partial, 2 * 60);
    expect(result.error).toBeNull();
    expect(result.match.stepStatus.m10).toBe("executed");
    expect(result.match.completedActionIds).toEqual(["m10-0", "m10-1"]);
    expect(result.match.events.map((event) => [event.elapsedSeconds, event.actions.map((action) => action.id)]))
      .toEqual([[540, ["m10-0"]], [600, ["m10-1"]]]);
    expect(result.match.secondsPlayed.maceo).toBe(120);
    expect(result.match.secondsPlayed.krijn).toBe(60);
  });

  it("leaves explicitly completed and skipped steps alone", () => {
    const early = executeDemoStep(advanceDemoClock(running(), 9 * 60), "m10");
    const completed = advanceDemoClockFollowingPlan(early, 2 * 60).match;
    expect(completed.events).toHaveLength(1);
    expect(completed.events[0].elapsedSeconds).toBe(540);
    const skipped = skipDemoStep(advanceDemoClock(running(), 9 * 60), "m10");
    const after = advanceDemoClockFollowingPlan(skipped, 2 * 60).match;
    expect(after.stepStatus.m10).toBe("skipped");
    expect(after.events).toHaveLength(1);
    expect(after.field).toEqual(skipped.field);
    expect(after.secondsPlayed.maceo).toBe(0);
  });

  it("applies overdue actions at the current minute without rewriting earlier minutes", () => {
    const late = advanceDemoClock(running(), 12 * 60);
    const result = advanceDemoClockFollowingPlan(late, 60);
    expect(result.error).toBeNull();
    expect(result.match.events[0]).toMatchObject({ elapsedSeconds: 720, plannedMinute: 10 });
    expect(result.match.secondsPlayed.revi).toBe(720);
    expect(result.match.secondsPlayed.maceo).toBe(60);
    expect(late.events).toHaveLength(0);
  });

  it("pauses on a manual conflict, retaining earlier progress but none of the failing step", () => {
    const manual = substituteDemoPlayer(advanceDemoClock(running(), 5 * 60), "milad", "lukas");
    const before = JSON.stringify(manual);
    const result = advanceDemoClockFollowingPlan(manual, 20 * 60);
    expect(result.error).toMatch(/minuut 20.*uitgaande speler/);
    expect(result.match).toMatchObject({ phase: "paused", elapsedSeconds: 1200 });
    expect(result.match.stepStatus).toMatchObject({ m10: "executed", m20: "pending", m30: "pending" });
    expect(result.match.events.map((event) => [event.type, event.elapsedSeconds])).toEqual([["manual", 300], ["planned", 600]]);
    expect(result.match.field).toContainEqual({ playerKey: "loek", slotId: 5 });
    expect(result.match.bench).toContain("sem");
    expect(result.match.secondsPlayed.loek).toBe(1200);
    expect(result.match.secondsPlayed.lukas).toBe(900);
    expect(result.match.completedActionIds).toEqual(["m10-0", "m10-1"]);
    expect(advanceDemoClockFollowingPlan(result.match, 60).match).toBe(result.match);
    expect(JSON.stringify(manual)).toBe(before);
  });

  it("supports actions at kickoff, identical minutes and the final whistle", () => {
    const plan = fixture();
    const first = plan.steps[0];
    plan.match.halftimeAtMinute = null;
    plan.steps = [
      { id: "kickoff", matchMinute: 0, actions: [first.actions[0]] },
      { id: "same-minute", matchMinute: 0, actions: [first.actions[1]] },
      { id: "final", matchMinute: 60, actions: [
        { id: "return", kind: "substitution", playerOutKey: "maceo", playerInKey: "revi" },
      ] },
    ];
    const result = advanceDemoClockFollowingPlan(startDemoClock(createDemoMatch(plan)), 5000);
    expect(result.error).toBeNull();
    expect(result.match.phase).toBe("finished");
    expect(result.match.events.map((event) => event.elapsedSeconds)).toEqual([0, 0, 3600]);
    expect(result.match.secondsPlayed.maceo).toBe(3600);
    expect(result.match.secondsPlayed.revi).toBe(0);
    expect(result.match.field).toContainEqual({ playerKey: "revi", slotId: 10 });
  });

  it("does nothing before kickoff, during a pause, after finishing or for a zero tick", () => {
    const ready = createDemoMatch(fixture());
    const live = startDemoClock(ready);
    const paused = pauseDemoClock(live);
    const final = finishAccordingToPlan();
    for (const state of [ready, paused, final]) {
      expect(advanceDemoClockFollowingPlan(state, 60)).toEqual({ match: state, error: null });
      expect(advanceDemoClockFollowingPlan(state, 60).match).toBe(state);
    }
    expect(advanceDemoClockFollowingPlan(live, 0).match).toBe(live);
  });

  it.each([-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])("rejects invalid clock delta %s", (seconds) => {
    expect(() => advanceDemoClockFollowingPlan(createDemoMatch(fixture()), seconds)).toThrow("geheel aantal seconden");
  });
});

describe("local demo match", () => {
  it("starts from the separate original plan and retains names, numbers, field and bench", () => {
    const plan = fixture();
    const state = createDemoMatch(plan);
    expect(state.phase).toBe("ready");
    expect(state.field).toEqual(plan.startingLineup.field);
    expect(state.bench).toEqual(["maceo", "krijn", "lukas"]);
    expect(state.events).toEqual([]);
    expect(Object.values(state.secondsPlayed).every((seconds) => seconds === 0)).toBe(true);
    expect(getDemoComparison(state).find((player) => player.playerKey === "milad")).toMatchObject({ name: "Miloud", number: 8 });
    plan.players[0].name = "Changed outside the demo";
    expect(state.plan.players[0].name).toBe("Luc");
    expect(plan.review?.sourceConfirmed).toBe(false);
    expect(state.plan.review?.sourceConfirmed).toBe(false);
  });

  it("counts the actual 12-minute confirmation, not the planned 10-minute moment", () => {
    const before = advanceDemoClock(running(), 12 * 60);
    const after = executeDemoStep(before, "m10");
    const state = advanceDemoClock(after, 8 * 60);
    expect(before.field).toContainEqual({ playerKey: "revi", slotId: 10 });
    expect(after.field).toContainEqual({ playerKey: "maceo", slotId: 10 });
    expect(state.events[0]).toMatchObject({ type: "planned", elapsedSeconds: 720, plannedMinute: 10, stepId: "m10" });
    expect(getDemoComparison(state).find((player) => player.playerKey === "revi")).toMatchObject({ actualMinutes: 12, plannedMinutesSoFar: 10, deltaMinutes: 2 });
    expect(getDemoComparison(state).find((player) => player.playerKey === "maceo")).toMatchObject({ actualMinutes: 8, plannedMinutesSoFar: 10, deltaMinutes: -2 });
    expect(state.plan.steps[0].matchMinute).toBe(10);
  });

  it("does not add seconds before kickoff or while paused", () => {
    const ready = createDemoMatch(fixture());
    expect(advanceDemoClock(ready, 120)).toBe(ready);
    const paused = pauseDemoClock(advanceDemoClock(startDemoClock(ready), 125));
    expect(advanceDemoClock(paused, 600)).toBe(paused);
    const resumed = advanceDemoClock(startDemoClock(paused), 55);
    expect(resumed.elapsedSeconds).toBe(180);
    expect(resumed.secondsPlayed.luc).toBe(180);
  });

  it("stops at halftime once, allows halftime substitutions, and discards break time", () => {
    const halftime = advanceDemoClock(running(), 45 * 60);
    expect(halftime).toMatchObject({ phase: "halftime", elapsedSeconds: 1800, halftimeTaken: true });
    expect(advanceDemoClock(halftime, 15 * 60)).toBe(halftime);
    const subbed = substituteDemoPlayer(halftime, "revi", "maceo");
    expect(subbed.secondsPlayed).toEqual(halftime.secondsPlayed);
    const resumed = advanceDemoClock(startDemoClock(subbed), 5 * 60);
    expect(resumed.phase).toBe("running");
    expect(resumed.elapsedSeconds).toBe(35 * 60);
    expect(resumed.secondsPlayed.revi).toBe(30 * 60);
    expect(resumed.secondsPlayed.maceo).toBe(5 * 60);
    expect(resumed.secondsPlayed.luc).toBe(35 * 60);
  });

  it("rolls back the whole multi-action step when a later action conflicts with the field", () => {
    const manual = substituteDemoPlayer(advanceDemoClock(running(), 10 * 60), "sem", "krijn");
    const before = JSON.stringify(manual);
    expect(() => executeDemoStep(manual, "m10")).toThrow("uitgaande speler");
    expect(JSON.stringify(manual)).toBe(before);
    expect(manual.field).toContainEqual({ playerKey: "revi", slotId: 10 });
    expect(manual.bench).toContain("maceo");
    expect(manual.stepStatus.m10).toBe("pending");
    expect(manual.events).toHaveLength(1);
  });

  it("executes the 50-minute group including Sem to CM and Olivier to LM atomically", () => {
    const state = finishAccordingToPlan();
    expect(state.field).toContainEqual({ playerKey: "sem", slotId: 6 });
    expect(state.field).toContainEqual({ playerKey: "olivier", slotId: 5 });
    expect(state.events.at(-1)?.actions).toHaveLength(4);
    expect(state.events.at(-1)?.actions.at(-1)?.kind).toBe("positionSwap");
    expect(state.bench).toEqual(["tygo", "krijn", "lukas"]);
  });

  it("finishes at 60 minutes with 660 field-minutes and exactly the original planned totals", () => {
    const state = finishAccordingToPlan();
    expect(state).toMatchObject({ phase: "finished", elapsedSeconds: 3600 });
    const comparison = getDemoComparison(state);
    expect(comparison.reduce((sum, player) => sum + player.actualMinutes, 0)).toBe(660);
    expect(comparison.reduce((sum, player) => sum + player.actualBenchMinutes, 0)).toBe(180);
    expect(comparison.every((player) => player.finalDeltaMinutes === 0 && player.deltaMinutes === 0)).toBe(true);
    expect(comparison.find((player) => player.playerKey === "luc")?.actualMinutes).toBe(60);
    expect(advanceDemoClock(state, 1200)).toBe(state);
    expect(startDemoClock(state)).toBe(state);
    expect(() => substituteDemoPlayer(state, "sem", "krijn")).toThrow("afgelopen");
  });

  it("caps a large second-half tick at the final whistle", () => {
    const halftime = advanceDemoClock(running(), 30 * 60);
    const final = advanceDemoClock(startDemoClock(halftime), 100 * 60);
    expect(final.elapsedSeconds).toBe(3600);
    expect(final.secondsPlayed.luc).toBe(3600);
    expect(final.phase).toBe("finished");
  });

  it("skips without changing minutes or field, and rejects invalid dependent plans", () => {
    const before = advanceDemoClock(running(), 10 * 60);
    const skipped = skipDemoStep(before, "m10");
    expect(skipped.field).toBe(before.field);
    expect(skipped.secondsPlayed).toBe(before.secondsPlayed);
    expect(skipped.stepStatus.m10).toBe("skipped");
    expect(skipped.events[0]).toMatchObject({ type: "skipped", stepId: "m10", actions: before.plan.steps[0].actions });
    expect(() => executeDemoStep(skipped, "m10")).toThrow("overgeslagen");
    expect(() => executeDemoStep(skipped, "m20")).toThrow("bank");
  });

  it("accepts an unplanned substitution and transfers the actual occupied slot", () => {
    const state = substituteDemoPlayer(advanceDemoClock(running(), 7 * 60), "tygo", "lukas");
    const later = advanceDemoClock(state, 60);
    expect(later.field).toContainEqual({ playerKey: "lukas", slotId: 8 });
    expect(later.bench).toContain("tygo");
    expect(later.secondsPlayed.tygo).toBe(7 * 60);
    expect(later.secondsPlayed.lukas).toBe(60);
    expect(later.events[0]).toMatchObject({ type: "manual", elapsedSeconds: 420 });
    expect(later.stepStatus.m10).toBe("pending");
    expect(later.plan.startingLineup.field).toContainEqual({ playerKey: "tygo", slotId: 8 });
  });

  it("keeps historical events and their actions immutable when more changes arrive", () => {
    const first = executeDemoStep(advanceDemoClock(running(), 600), "m10");
    const event = first.events[0];
    const original = JSON.stringify(event);
    const later = executeDemoStep(advanceDemoClock(first, 600), "m20");
    expect(first.events).toHaveLength(1);
    expect(later.events).toHaveLength(2);
    expect(later.events[0]).toBe(event);
    expect(JSON.stringify(event)).toBe(original);
    expect(Object.isFrozen(event)).toBe(true);
    expect(Object.isFrozen(event.actions)).toBe(true);
    expect(Object.isFrozen(event.actions[0])).toBe(true);
    expect(Reflect.set(event, "elapsedSeconds", 0)).toBe(false);
    expect(Reflect.set(first.plan.steps[0], "matchMinute", 0)).toBe(false);
  });

  it("rejects duplicate execution, self-swap and an incoming player already on the field", () => {
    const state = executeDemoStep(advanceDemoClock(running(), 600), "m10");
    const original = JSON.stringify(state);
    expect(() => executeDemoStep(state, "m10")).toThrow("uitgevoerd");
    expect(() => skipDemoStep(state, "m10")).toThrow("uitgevoerd");
    expect(() => substituteDemoPlayer(state, "tygo", "tygo")).toThrow("zichzelf");
    expect(() => substituteDemoPlayer(state, "tygo", "lucas")).toThrow("bank");
    expect(() => substituteDemoPlayer(state, "tygo", "unknown")).toThrow("selectie");
    expect(JSON.stringify(state)).toBe(original);
    expect(new Set([...state.field.map((entry) => entry.playerKey), ...state.bench]).size).toBe(14);
  });

  it("can deliberately replace the keeper without leaving the keeper slot ambiguous", () => {
    const state = substituteDemoPlayer(running(), "luc", "lukas");
    expect(state.keeperKey).toBe("lukas");
    expect(state.field).toContainEqual({ playerKey: "lukas", slotId: 0 });
    expect(state.events[0].actions[0].keeperKey).toBe("lukas");
  });

  it("swaps currently occupied positions without substituting players or rewriting the original plan", () => {
    const before = substituteDemoPlayer(advanceDemoClock(running(), 420), "tygo", "lukas");
    const originalPlan = JSON.stringify(before.plan);
    const after = swapDemoPlayerPositions(before, "lukas", "jody");
    expect(after.field).toContainEqual({ playerKey: "lukas", slotId: 1 });
    expect(after.field).toContainEqual({ playerKey: "jody", slotId: 8 });
    expect(after.field.map((entry) => entry.playerKey).sort()).toEqual(before.field.map((entry) => entry.playerKey).sort());
    expect(after.bench).toEqual(before.bench);
    expect(after.secondsPlayed).toBe(before.secondsPlayed);
    expect(after.keeperKey).toBe("luc");
    expect(after.plan).toBe(before.plan);
    expect(JSON.stringify(after.plan)).toBe(originalPlan);
    expect(after.stepStatus).toBe(before.stepStatus);
    expect(after.events[0]).toBe(before.events[0]);
    expect(after.events[1]).toMatchObject({
      id: "demo-event-2", type: "manual", elapsedSeconds: 420,
      actions: [{ id: "manual-2", kind: "positionSwap", playerOutKey: "lukas", playerInKey: "jody" }],
    });
    expect(Object.isFrozen(after.events[1].actions[0])).toBe(true);
    const later = advanceDemoClock(after, 60);
    expect(later.secondsPlayed.lukas).toBe(60);
    expect(later.secondsPlayed.jody).toBe(480);
    expect(later.secondsPlayed.tygo).toBe(420);
  });

  it.each(["running", "paused", "halftime"] as const)("allows a position swap during %s without advancing time", (phase) => {
    const live = advanceDemoClock(running(), phase === "halftime" ? 1800 : 120);
    const before = phase === "paused" ? pauseDemoClock(live) : live;
    const after = swapDemoPlayerPositions(before, "sem", "loek");
    expect(after.phase).toBe(phase);
    expect(after.elapsedSeconds).toBe(before.elapsedSeconds);
    expect(after.secondsPlayed).toBe(before.secondsPlayed);
    expect(after.events[0].elapsedSeconds).toBe(before.elapsedSeconds);
    expect(after.field).toContainEqual({ playerKey: "sem", slotId: 5 });
    expect(after.field).toContainEqual({ playerKey: "loek", slotId: 6 });
  });

  it.each([["luc", "jody"], ["jody", "luc"]])("records the new keeper when swapping %s with %s", (playerA, playerB) => {
    const before = advanceDemoClock(running(), 120);
    const after = swapDemoPlayerPositions(before, playerA, playerB);
    expect(after.keeperKey).toBe("jody");
    expect(after.field).toContainEqual({ playerKey: "jody", slotId: 0 });
    expect(after.field).toContainEqual({ playerKey: "luc", slotId: 1 });
    expect(after.events[0].actions[0].keeperKey).toBe("jody");
    expect(after.secondsPlayed).toBe(before.secondsPlayed);
    // Further swaps use the current keeper, not the original plan's keeper.
    const next = swapDemoPlayerPositions(after, "jody", "sem");
    expect(next.keeperKey).toBe("sem");
    expect(next.events[1].actions[0].keeperKey).toBe("sem");
    expect(next.secondsPlayed).toBe(before.secondsPlayed);
  });

  it.each([
    ["loek", "sem"], ["sem", "loek"], ["loek", "unknown"], ["unknown", "loek"], ["loek", "loek"],
  ])("rejects invalid position pair %s/%s without changing any state", (playerA, playerB) => {
    const state = executeDemoStep(advanceDemoClock(running(), 600), "m10");
    // Sem is on the bench after the first planned group; Loek is still on the field.
    const snapshot = JSON.stringify(state);
    expect(() => swapDemoPlayerPositions(state, playerA, playerB)).toThrow();
    expect(JSON.stringify(state)).toBe(snapshot);
    expect(state.events).toHaveLength(1);
  });

  it("rejects position changes before kickoff and after the final whistle", () => {
    expect(() => swapDemoPlayerPositions(createDemoMatch(fixture()), "sem", "loek")).toThrow("Start eerst");
    expect(() => swapDemoPlayerPositions(finishAccordingToPlan(), "sem", "olivier")).toThrow("afgelopen");
  });

  it("changes the live formation layout while preserving current players, minutes and the original plan", () => {
    const before = substituteDemoPlayer(advanceDemoClock(running(), 420), "tygo", "lukas");
    const originalPlan = JSON.stringify(before.plan);
    const positions = ["GK", "LB", "CB", "CB", "RB", "LM", "CM", "CM", "RM", "ST", "ST"];
    const formation = {
      id: "4-4-2", name: "4-4-2",
      slots: positions.map((position, id) => ({ id, position, x: id === 0 ? 50 : id * 9, y: id === 0 ? 87 : 100 - id * 7 })),
    };
    const after = changeDemoFormation(before, formation);
    expect(after.formation).toEqual(formation);
    expect(after.formation).not.toBe(formation);
    expect(after.field).toBe(before.field);
    expect(after.field).toContainEqual({ playerKey: "lukas", slotId: 8 });
    expect(after.bench).toBe(before.bench);
    expect(after.secondsPlayed).toBe(before.secondsPlayed);
    expect(after.elapsedSeconds).toBe(420);
    expect(after.stepStatus).toBe(before.stepStatus);
    expect(after.plan).toBe(before.plan);
    expect(JSON.stringify(after.plan)).toBe(originalPlan);
    expect(after.events[1]).toMatchObject({ type: "formation", elapsedSeconds: 420, actions: [], formation });
    formation.slots[1].x = 33;
    expect(after.formation.slots[1].x).toBe(9);
    expect(after.events[1].formation?.slots[1].x).toBe(9);
    expect(Object.isFrozen(after.events[1].formation?.slots[1])).toBe(true);
  });

  it("validates formation keeper placement against the actual keeper after a position swap", () => {
    const before = swapDemoPlayerPositions(advanceDemoClock(running(), 120), "luc", "jody");
    const formation: DemoFormationState = {
      name: "Actuele keeper",
      slots: before.formation.slots.map((slot) => ({ ...slot })),
    };
    const after = changeDemoFormation(before, formation);
    expect(after.keeperKey).toBe("jody");
    expect(after.plan.startingLineup.keeperKey).toBe("luc");
    const movedKeeperSlot = {
      slots: formation.slots.map((slot) => ({ ...slot, position: slot.id === 1 ? "GK" : slot.id === 0 ? "LB" : slot.position })),
    };
    const snapshot = JSON.stringify(after);
    expect(() => changeDemoFormation(after, movedKeeperSlot)).toThrow("huidige keeper");
    expect(JSON.stringify(after)).toBe(snapshot);
    const next = swapDemoPlayerPositions(after, "jody", "sem");
    expect(next.keeperKey).toBe("sem");
    expect(next.formation).toBe(after.formation);
  });

  it.each(["paused", "halftime"] as const)("allows formation changes during %s without resuming or adding minutes", (phase) => {
    const live = advanceDemoClock(running(), phase === "halftime" ? 1800 : 120);
    const before = phase === "paused" ? pauseDemoClock(live) : live;
    const after = changeDemoFormation(before, { ...before.formation, name: "Nieuwe vorm" });
    expect(after.phase).toBe(phase);
    expect(after.elapsedSeconds).toBe(before.elapsedSeconds);
    expect(after.secondsPlayed).toBe(before.secondsPlayed);
    expect(after.events[0]).toMatchObject({ type: "formation", elapsedSeconds: before.elapsedSeconds, actions: [] });
  });

  it("rejects invalid layouts atomically: missing/duplicate/unknown slots, keeper, labels and coordinates", () => {
    const state = running();
    const slots = state.formation.slots;
    const invalid: DemoFormationState[] = [
      { slots: slots.slice(1) },
      { slots: slots.map((slot) => ({ ...slot, id: slot.id === 1 ? 2 : slot.id })) },
      { slots: slots.map((slot) => ({ ...slot, id: slot.id === 1 ? 99 : slot.id })) },
      { slots: slots.map((slot) => ({ ...slot, position: slot.id === 0 ? "CB" : slot.position })) },
      { slots: slots.map((slot) => ({ ...slot, position: slot.id === 1 ? "GK" : slot.position })) },
      { slots: slots.map((slot) => ({ ...slot, position: slot.id === 1 ? " " : slot.position })) },
      { slots: slots.map((slot) => ({ ...slot, x: slot.id === 1 ? NaN : 50 })) },
      { slots: slots.map((slot) => ({ ...slot, y: slot.id === 1 ? Infinity : 50 })) },
    ];
    const snapshot = JSON.stringify(state);
    for (const formation of invalid) {
      expect(() => changeDemoFormation(state, formation)).toThrow();
      expect(JSON.stringify(state)).toBe(snapshot);
    }
  });

  it("rejects formation changes outside active play and handles development sessions without a live layout", () => {
    const ready = createDemoMatch(fixture());
    expect(() => changeDemoFormation(ready, ready.formation)).toThrow("Start eerst");
    const finished = finishAccordingToPlan();
    expect(() => changeDemoFormation(finished, finished.formation)).toThrow("afgelopen");
    // A preserved React state from before this field existed can still execute actions after hot reload.
    const legacy = { ...running(), formation: undefined } as unknown as DemoMatchState;
    const after = swapDemoPlayerPositions(legacy, "luc", "jody");
    expect(after.keeperKey).toBe("jody");
    expect(changeDemoFormation(after, ready.formation).formation).toEqual(ready.formation);
  });

  it("executes one plan action at ten minutes and the remaining group once at twelve minutes", () => {
    const before = advanceDemoClock(running(), 600);
    const partial = executeDemoAction(before, "m10", "m10-0");
    expect(partial.completedActionIds).toEqual(["m10-0"]);
    expect(partial.stepStatus.m10).toBe("pending");
    expect(partial.field).toContainEqual({ playerKey: "maceo", slotId: 10 });
    expect(partial.field).toContainEqual({ playerKey: "sem", slotId: 6 });
    expect(partial.events[0].actions.map((action) => action.id)).toEqual(["m10-0"]);
    const completed = executeDemoStep(advanceDemoClock(partial, 120), "m10");
    expect(completed.completedActionIds).toEqual(["m10-0", "m10-1"]);
    expect(completed.stepStatus.m10).toBe("executed");
    expect(completed.events[1].actions.map((action) => action.id)).toEqual(["m10-1"]);
    expect(completed.events[1].elapsedSeconds).toBe(720);
    expect(completed.secondsPlayed.revi).toBe(600);
    expect(completed.secondsPlayed.sem).toBe(720);
    expect(completed.secondsPlayed.maceo).toBe(120);
    expect(completed.secondsPlayed.krijn).toBe(0);
    const comparison = getDemoComparison(completed);
    expect(comparison.find((player) => player.playerKey === "revi")?.deltaMinutes).toBe(0);
    expect(comparison.find((player) => player.playerKey === "sem")?.deltaMinutes).toBe(2);
    expect(comparison.find((player) => player.playerKey === "krijn")?.deltaMinutes).toBe(-2);
    expect(() => executeDemoStep(completed, "m10")).toThrow("uitgevoerd");
    expect(before.completedActionIds).toEqual([]);
  });

  it("marks a group executed after its last individual action and cannot replay completed actions", () => {
    const partial = executeDemoAction(advanceDemoClock(running(), 600), "m10", "m10-1");
    const snapshot = JSON.stringify(partial);
    expect(() => executeDemoAction(partial, "m10", "m10-1")).toThrow("al uitgevoerd");
    expect(() => executeDemoAction(partial, "m10", "m20-0")).toThrow("hoort niet");
    expect(JSON.stringify(partial)).toBe(snapshot);
    const complete = executeDemoAction(partial, "m10", "m10-0");
    expect(complete.stepStatus.m10).toBe("executed");
    expect(new Set(complete.completedActionIds).size).toBe(2);
    expect(complete.events).toHaveLength(2);
  });

  it("skips only the unexecuted remainder of a partially completed group", () => {
    const partial = executeDemoAction(advanceDemoClock(running(), 600), "m10", "m10-0");
    const skipped = skipDemoStep(partial, "m10");
    expect(skipped.stepStatus.m10).toBe("skipped");
    expect(skipped.completedActionIds).toEqual(["m10-0"]);
    expect(skipped.events[1]).toMatchObject({ type: "skipped", actions: [partial.plan.steps[0].actions[1]] });
    expect(skipped.field).toBe(partial.field);
    expect(skipped.secondsPlayed).toBe(partial.secondsPlayed);
    expect(skipped.events[1].snapshot.field).toEqual(partial.field);
    expect(skipped.events[0]).toBe(partial.events[0]);
    expect(() => executeDemoAction(skipped, "m10", "m10-1")).toThrow("overgeslagen");
  });

  it("leaves a partial group unchanged when its remaining action becomes invalid", () => {
    const partial = executeDemoAction(advanceDemoClock(running(), 600), "m10", "m10-0");
    const manual = substituteDemoPlayer(partial, "sem", "krijn");
    const snapshot = JSON.stringify(manual);
    expect(() => executeDemoAction(manual, "m10", "m10-1")).toThrow("uitgaande speler");
    expect(() => executeDemoStep(manual, "m10")).toThrow("uitgaande speler");
    expect(JSON.stringify(manual)).toBe(snapshot);
    expect(manual.completedActionIds).toEqual(["m10-0"]);
    expect(manual.stepStatus.m10).toBe("pending");
  });

  it("captures the actual field after each event and preserves its layout across later formation changes", () => {
    const substitution = executeDemoAction(advanceDemoClock(running(), 600), "m10", "m10-0");
    const firstSnapshot = substitution.events[0].snapshot;
    expect(firstSnapshot.field).toEqual(substitution.field);
    expect(firstSnapshot.field).toContainEqual({ playerKey: "maceo", slotId: 10 });
    expect(firstSnapshot.bench).toEqual(substitution.bench);
    expect(firstSnapshot.keeperKey).toBe("luc");
    const original = JSON.stringify(firstSnapshot);
    const formation = { name: "4-4-2", slots: substitution.formation.slots.map((slot) => ({ ...slot, x: 40, y: 60 })) };
    const changed = changeDemoFormation(substitution, formation);
    expect(changed.events[1].snapshot.formation).toEqual(formation);
    expect(changed.events[1].snapshot.field).toEqual(substitution.field);
    const swapped = swapDemoPlayerPositions(changed, "luc", "jody");
    expect(swapped.events[2].snapshot.keeperKey).toBe("jody");
    expect(swapped.events[2].snapshot.field).toContainEqual({ playerKey: "jody", slotId: 0 });
    expect(swapped.events[0].snapshot).toBe(firstSnapshot);
    expect(JSON.stringify(firstSnapshot)).toBe(original);
    expect(Object.isFrozen(firstSnapshot.field[0])).toBe(true);
    expect(Object.isFrozen(firstSnapshot.bench)).toBe(true);
    expect(Object.isFrozen(firstSnapshot.formation.slots[0])).toBe(true);
    expect(Reflect.set(firstSnapshot, "keeperKey", "jody")).toBe(false);
  });

  it("supports old hot-reloaded state without completed action IDs or a live formation", () => {
    const legacy = { ...advanceDemoClock(running(), 600), completedActionIds: undefined, formation: undefined } as unknown as DemoMatchState;
    const after = executeDemoAction(legacy, "m10", "m10-0");
    expect(after.completedActionIds).toEqual(["m10-0"]);
    expect(after.events[0].snapshot.formation).toEqual(legacy.plan.formation);
    expect(executeDemoStep(after, "m10").completedActionIds).toEqual(["m10-0", "m10-1"]);
  });

  it("rejects invalid initial state, unknown steps and noninteger clock increments", () => {
    const plan = fixture();
    plan.startingLineup.bench.push("luc");
    expect(() => createDemoMatch(plan)).toThrow("dubbel");
    const state = running();
    expect(() => executeDemoStep(state, "missing")).toThrow("bestaat niet");
    for (const seconds of [-1, 1.5, NaN, Infinity]) {
      expect(() => advanceDemoClock(state, seconds)).toThrow("geheel");
    }
    expect(() => executeDemoStep(createDemoMatch(fixture()), "m10")).toThrow("Start eerst");
  });

  it("resets by creating a fresh state without altering the previous session or original plan", () => {
    const plan = fixture();
    const previous = executeDemoStep(advanceDemoClock(startDemoClock(createDemoMatch(plan)), 600), "m10");
    const fresh = createDemoMatch(plan);
    expect(previous.events).toHaveLength(1);
    expect(fresh.events).toHaveLength(0);
    expect(fresh.elapsedSeconds).toBe(0);
    expect(fresh.stepStatus.m10).toBe("pending");
    expect(fresh.field).toEqual(plan.startingLineup.field);
  });
});
