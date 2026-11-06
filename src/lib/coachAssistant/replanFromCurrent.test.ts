import { describe, expect, it } from "vitest";
import { applyRemainingProposal, replanFromCurrent } from "./replanFromCurrent";
import { advanceDemoClock, advanceDemoClockFollowingPlan, changeDemoFormation, createDemoMatch, executeDemoAction, getDemoSteps, startDemoClock, substituteDemoPlayer, type DemoMatchState } from "../substitutions/demoMatch";
import type { DemoPlan } from "../substitutions/demoPlan";
import type { AssistantPlayer } from "./types";

const plan: DemoPlan = {
  match: { regulationDurationMinutes: 60, fieldPlayerCountIncludingKeeper: 3, halftimeAtMinute: 30 },
  formation: { slots: [{ id: 0, position: "GK", x: 50, y: 90 }, { id: 1, position: "CB", x: 25, y: 60 }, { id: 2, position: "ST", x: 50, y: 20 }] },
  players: ["keeper", "a", "b", "c"].map((key, number) => ({ key, name: key, number })),
  startingLineup: { keeperKey: "keeper", field: [{ playerKey: "keeper", slotId: 0 }, { playerKey: "a", slotId: 1 }, { playerKey: "b", slotId: 2 }], bench: ["c"] },
  steps: [{ id: "old10", matchMinute: 10, actions: [{ id: "oldAction", kind: "substitution", playerOutKey: "a", playerInKey: "c" }] }],
};
const players: AssistantPlayer[] = plan.players.map(({ key }) => ({ key, availability: "present", primaryPosition: key === "b" ? "ST" : "CB", secondaryPosition: null }));
const settings = { players, teamKey: "team", targetDate: "2026-11-07", history: [], intervalMinutes: 10 };
function active() { return advanceDemoClock(startDemoClock(createDemoMatch(plan)), 450); }
function finish(state: DemoMatchState) {
  let result = advanceDemoClockFollowingPlan(startDemoClock(state), 3600 - state.elapsedSeconds);
  expect(result.error).toBeNull();
  if (result.match.phase === "halftime") result = advanceDemoClockFollowingPlan(startDemoClock(result.match), 3600 - result.match.elapsedSeconds);
  expect(result.error).toBeNull();
  return result.match;
}

describe("remaining match planning", () => {
  it("can resume from a non-round clock time without floating-point second errors", () => {
    const current = advanceDemoClock(startDemoClock(createDemoMatch(plan)), 245);
    const proposal = replanFromCurrent(current, settings);
    expect(finish(applyRemainingProposal(current, proposal)).elapsedSeconds).toBe(3600);
  });
  it("starts after a manual change with actual minutes, retains history and follows only new future steps", () => {
    const current = substituteDemoPlayer(active(), "a", "c");
    const before = structuredClone(current);
    const proposal = replanFromCurrent(current, settings);
    expect(proposal.plan.startingLineup.field).toEqual(current.field);
    expect(proposal.steps[0].matchMinute).toBe(17.5);
    expect(proposal.totals.find((row) => row.key === "a")?.played).toBe(7.5);
    expect(proposal.steps[0].actions.some((action) => action.playerInKey === "a")).toBe(true);
    const revised = applyRemainingProposal(current, proposal);
    expect(revised.elapsedSeconds).toBe(450);
    expect(revised.phase).toBe("paused");
    expect(revised.field).toEqual(current.field);
    expect(revised.events).toEqual(current.events);
    expect(revised.secondsPlayed).toEqual(current.secondsPlayed);
    expect(revised.plan).toEqual(current.plan);
    expect(getDemoSteps(revised).some((step) => step.id === "old10")).toBe(false);
    const ended = finish(revised);
    for (const row of proposal.totals) expect(ended.secondsPlayed[row.key] / 60).toBeCloseTo(row.expected);
    expect(ended.phase).toBe("finished");
    expect(Object.values(ended.secondsPlayed).reduce((sum, seconds) => sum + seconds, 0)).toBe(10800);
    expect(current).toEqual(before);
  });

  it("rejects stale previews and allows repeated planning after an already executed action and formation change", () => {
    const current = executeDemoAction(active(), "old10", "oldAction");
    const proposal = replanFromCurrent(current, settings);
    expect(() => applyRemainingProposal(advanceDemoClock(current, 1), proposal)).toThrow(/veranderd/);
    const revised = applyRemainingProposal(current, proposal);
    const changed = changeDemoFormation(revised, { slots: plan.formation.slots.map((slot) => ({ ...slot, position: slot.id === 1 ? "LB" : slot.position })) });
    const second = replanFromCurrent(changed, settings);
    expect(second.steps[0].id).not.toBe(proposal.steps[0].id);
    expect(second.plan.formation.slots[1].position).toBe("LB");
    expect(finish(applyRemainingProposal(changed, second)).phase).toBe("finished");
  });

  it("retains a pending halftime keeper change and checks minute caps", () => {
    const keeperPlan: DemoPlan = { ...plan, steps: [{ id: "half", matchMinute: 30, actions: [{ id: "keeperChange", kind: "substitution", playerOutKey: "keeper", playerInKey: "c", keeperKey: "c" }] }] };
    const current = advanceDemoClock(startDemoClock(createDemoMatch(keeperPlan)), 600);
    const proposal = replanFromCurrent(current, settings);
    expect(proposal.steps.find((step) => step.matchMinute === 30)?.actions).toContainEqual(expect.objectContaining({ playerInKey: "c", keeperKey: "c" }));
    expect(finish(applyRemainingProposal(current, proposal)).keeperKey).toBe("c");
    expect(() => replanFromCurrent(current, { ...settings, players: players.map((player) => ({ ...player, ...(player.key === "a" ? { maxMinutes: 15 } : {}) })) })).toThrow(/minutengrens/);
    expect(() => replanFromCurrent(createDemoMatch(plan), settings)).toThrow(/tijdens/);
    expect(() => replanFromCurrent(finish(current), settings)).toThrow(/tijdens/);
  });
});
