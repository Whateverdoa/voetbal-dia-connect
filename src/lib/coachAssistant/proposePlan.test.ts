import { describe, expect, it } from "vitest";
import { REESHOF_PLAN } from "../substitutions/reeshofPlan";
import { validatePortableSubstitutionPlan } from "../substitutions/validatePortableSubstitutionPlan";
import type { DemoPlan } from "../substitutions/demoPlan";
import { proposeCoachPlan } from "./proposePlan";
import { assignField } from "./assignment";
import { collectEvidence } from "./history";
import type { AssistantHistoryMatch, AssistantInput, AssistantProposal } from "./types";

function inputFor(plan: DemoPlan = REESHOF_PLAN): AssistantInput {
  return { teamKey: "team", targetDate: "2026-10-10", plan: structuredClone(plan), keeperKey: plan.startingLineup.keeperKey,
    intervalMinutes: 10, includeSubstitutions: true, history: [],
    players: plan.players.map((player) => ({ key: player.key, availability: player.absent ? "injured" : "present", primaryPosition: null, secondaryPosition: null })) };
}

function proposal(input: AssistantInput): AssistantProposal {
  const result = proposeCoachPlan(input);
  if (!result.ok) throw new Error(result.errors.join("; "));
  return result.proposal;
}

const smallPlan: DemoPlan = {
  format: "dia-substitution-plan", version: 1,
  match: { regulationDurationMinutes: 60, fieldPlayerCountIncludingKeeper: 3, halftimeAtMinute: 30 },
  formation: { slots: [{ id: 0, position: "GK", x: 50, y: 90 }, { id: 1, position: "CB", x: 25, y: 60 }, { id: 2, position: "ST", x: 50, y: 20 }] },
  players: [{ key: "keeper", name: "Keeper", number: 1 }, { key: "a", name: "A", number: 2 }, { key: "b", name: "B", number: 3 }, { key: "c", name: "C", number: 4 }],
  startingLineup: { keeperKey: "keeper", field: [{ playerKey: "keeper", slotId: 0 }, { playerKey: "a", slotId: 1 }, { playerKey: "c", slotId: 2 }], bench: ["b"] }, steps: [],
};

function history(minutes: [number | null, number | null, number | null] = [20, 40, 50]): AssistantHistoryMatch {
  return { id: "previous", teamKey: "team", date: "2026-10-03", opponent: "Tegenstander", playingDuration: 60,
    confirmed: true, startingLineupConfirmed: false,
    players: ["a", "b", "c"].map((playerKey, index) => ({ playerKey, attendance: "present", minutes: minutes[index], keeperMinutes: 0, startingPosition: null })) };
}

describe("deterministic coach assistant", () => {
  it("creates an executable full Reeshof plan with a fixed keeper and balanced minutes, without mutating sources", () => {
    const input = inputFor();
    const before = structuredClone(input);
    const result = proposal(input);
    const report = validatePortableSubstitutionPlan(result.plan);
    expect(report.simulationComplete).toBe(true);
    expect(report.totals?.playingMinutes).toBe(660);
    expect(report.minutes.byPlayer).toHaveLength(14);
    expect(result.plan.review?.sourceConfirmed).toBe(false);
    expect(result.usesHistoricalMinutes).toBe(false);
    expect(result.usesHistoricalStarts).toBe(false);
    expect(result.warnings.join(" ")).toMatch(/onvoldoende.*minuten/i);
    expect(result.warnings.join(" ")).toMatch(/voorkeur.*controleer/i);
    for (const snapshot of report.snapshots) {
      expect(snapshot.field).toHaveLength(11);
      expect(snapshot.field.find((entry) => entry.slotId === 0)?.playerKey).toBe("reeshof-p03");
      expect([...snapshot.field.map((entry) => entry.playerKey), ...snapshot.bench]).not.toContain("reeshof-p07");
      expect(new Set([...snapshot.field.map((entry) => entry.playerKey), ...snapshot.bench]).size).toBe(14);
    }
    const minutes = report.minutes.byPlayer.filter((row) => row.playerKey !== "reeshof-p03").map((row) => row.playingMinutes);
    expect(Math.max(...minutes) - Math.min(...minutes)).toBeLessThanOrEqual(10);
    expect(input).toEqual(before);
    expect(proposal(input)).toEqual(result);
    expect(result.plan.players.find((player) => player.key === "reeshof-p07")?.unavailableReason).toBe("injured");
  });

  it("keeps retained players in a suitable place instead of chasing first preferences at every moment", () => {
    const input = inputFor(smallPlan);
    input.players[2].primaryPosition = "CB"; input.players[2].secondaryPosition = "ST";
    input.players[3].primaryPosition = "ST"; input.players[3].secondaryPosition = "CB";
    const evidence = new Map(collectEvidence(input).evidence.map((row) => [row.playerKey, row]));
    const result = assignField({ players: input.players.slice(1), slots: smallPlan.formation.slots.slice(1), evidence,
      plannedMinutes: new Map([["a", 60], ["b", 0], ["c", 0]]), duration: 60, useMinutes: false, useStarts: false,
      reference: [{ playerKey: "a", slotId: 1 }, { playerKey: "b", slotId: 2 }], kickoff: false });
    expect(result).toEqual([{ playerKey: "c", slotId: 1 }, { playerKey: "b", slotId: 2 }]);
  });

  it("assigns specialists and versatile players globally instead of consuming the only striker for defense", () => {
    const input = inputFor(smallPlan);
    input.includeSubstitutions = false;
    input.players[1].primaryPosition = "CB";
    input.players[1].secondaryPosition = "ST";
    input.players[2].primaryPosition = "CB";
    input.players[3].availability = "absent";
    const result = proposal(input);
    expect(result.plan.startingLineup.field).toContainEqual({ playerKey: "b", slotId: 1 });
    expect(result.plan.startingLineup.field).toContainEqual({ playerKey: "a", slotId: 2 });
    expect(result.plan.steps).toEqual([]);
  });

  it("prefers a lower verified playing share over a lower raw total and never treats the source lineup as history", () => {
    const input = inputFor(smallPlan);
    input.history = [history([35, 40, 30]), { ...history([35, 40, null]), id: "older", date: "2026-09-26" }];
    // A: 70/120, B: 80/120, C: 30/60. C and A have the lower playing shares.
    const result = proposal(input);
    expect(result.usesHistoricalMinutes).toBe(true);
    expect(result.plan.startingLineup.bench).toEqual(["b"]);
    expect(result.usesHistoricalStarts).toBe(false);
    expect(result.evidence.find((row) => row.playerKey === "c")?.fieldMinutes).toBe(30);
  });

  it("keeps missing minutes unknown and disables historical fairness when coverage is incomplete", () => {
    const input = inputFor(smallPlan);
    input.history = [history([0, null, 50])];
    const result = proposal(input);
    expect(result.usesHistoricalMinutes).toBe(false);
    expect(result.evidence.find((row) => row.playerKey === "a")?.fieldMinutes).toBe(0);
    expect(result.evidence.find((row) => row.playerKey === "b")?.fieldMinutes).toBeNull();
  });

  it("ignores absent/unknown attendance, unreviewed, foreign, future and duplicate matches", () => {
    const input = inputFor(smallPlan);
    const base = history();
    input.history = [
      { ...base, id: "future", date: "2026-10-10" }, { ...base, id: "foreign", teamKey: "other" },
      { ...base, id: "unreviewed", confirmed: false }, base, structuredClone(base),
      { ...base, id: "attendance", players: base.players.map((row) => ({ ...row, attendance: row.playerKey === "a" ? "absent" : "unknown" })) },
    ];
    const collected = collectEvidence(input);
    expect(collected.evidence.every((row) => row.fieldMinutes === null)).toBe(true);
    expect(collected.warnings.join(" ")).toMatch(/Dubbele/);
  });

  it("uses only explicitly confirmed earlier starts and preserves BENCH as a confirmed non-start", () => {
    const input = inputFor(smallPlan);
    const previous = history([40, 40, 40]);
    previous.players = previous.players.map((row) => ({ ...row, startingPosition: row.playerKey === "b" ? "BENCH" : row.playerKey === "a" ? "CB" : "ST" }));
    input.history = [previous];
    expect(proposal(input).usesHistoricalStarts).toBe(false);
    previous.startingLineupConfirmed = true;
    const result = proposal(input);
    expect(result.usesHistoricalStarts).toBe(true);
    expect(result.evidence.find((row) => row.playerKey === "b")?.starts).toBe(0);
    expect(result.evidence.find((row) => row.playerKey === "a")?.previousPositions).toEqual(["CB"]);
  });

  it("uses confirmed position history to place a player and shows its origin", () => {
    const input = inputFor(smallPlan);
    const previous = history();
    previous.startingLineupConfirmed = true;
    previous.players = previous.players.map((row) => ({ ...row, startingPosition: row.playerKey === "a" ? "ST" : row.playerKey === "b" ? "CB" : "BENCH" }));
    input.history = [previous];
    const result = proposal(input);
    expect(result.plan.startingLineup.field).toContainEqual({ playerKey: "a", slotId: 2 });
    expect(result.reasons.find((row) => row.playerKey === "a")?.text).toMatch(/Bevestigde eerdere basispositie/);
  });

  it("preserves locked places at every transition and reports conflicting locks", () => {
    const input = inputFor(smallPlan);
    input.players[1].lockedSlotId = 1;
    const report = validatePortableSubstitutionPlan(proposal(input).plan);
    expect(report.snapshots.every((snapshot) => snapshot.field.some((entry) => entry.playerKey === "a" && entry.slotId === 1))).toBe(true);
    input.players[2].lockedSlotId = 1;
    expect(proposeCoachPlan(input)).toMatchObject({ ok: false, errors: ["Twee spelers staan vast op dezelfde plek."] });
  });

  it("blocks an unavailable keeper, malformed slots and zero interval but allows playing outside preferences", () => {
    const input = inputFor(smallPlan);
    input.players[0].availability = "injured";
    expect(proposeCoachPlan(input).ok).toBe(false);
    input.players[0].availability = "present";
    input.players.slice(1).forEach((player) => { player.primaryPosition = "CB"; });
    expect(proposeCoachPlan(input).ok).toBe(true);
    input.intervalMinutes = 0;
    expect(proposeCoachPlan(input).ok).toBe(false);
    input.intervalMinutes = 10;
    input.plan.formation.slots[1].position = "INVALID";
    expect(proposeCoachPlan(input).ok).toBe(false);
  });

  it("gives equal minutes priority over preferred positions and prevents repeated long bench spells", () => {
    const input = inputFor();
    input.players.forEach((player, index) => { player.primaryPosition = index % 2 ? "ST" : "CB"; });
    const result = proposal(input);
    const report = validatePortableSubstitutionPlan(result.plan);
    const fieldPlayers = report.minutes.byPlayer.filter((player) => player.playerKey !== input.keeperKey && !input.plan.players.find((row) => row.key === player.playerKey)?.absent);
    expect(Math.max(...fieldPlayers.map((row) => row.playingMinutes)) - Math.min(...fieldPlayers.map((row) => row.playingMinutes))).toBeLessThanOrEqual(input.intervalMinutes);
    expect(Math.max(...fieldPlayers.map((row) => row.longestBenchStintMinutesNominal))).toBeLessThanOrEqual(20);
    expect(result.warnings.join(" ")).toMatch(/buiten hun voorkeurslinie/);
  });

  it("keeps a fixed goalkeeper out of every planned substitution", () => {
    const input = inputFor(); input.keepKeeper = true;
    const result = proposal(input);
    expect(result.plan.steps.flatMap((step) => step.actions).every((action) => action.playerOutKey !== input.keeperKey && action.playerInKey !== input.keeperKey)).toBe(true);
    expect(validatePortableSubstitutionPlan(result.plan).minutes.byPlayer.find((row) => row.playerKey === input.keeperKey)?.keeperMinutes).toBe(60);
  });

  it("changes goalkeeper at halftime even when it is outside the regular interval", () => {
    const input = inputFor(smallPlan); input.keepKeeper = false; input.secondKeeperKey = "c"; input.intervalMinutes = 20;
    const result = proposal(input);
    const report = validatePortableSubstitutionPlan(result.plan);
    expect(report.simulationComplete).toBe(true);
    expect(result.plan.steps.find((step) => step.matchMinute === 30)?.actions).toContainEqual(expect.objectContaining({ playerOutKey: "keeper", playerInKey: "c", keeperKey: "c" }));
    for (const key of ["keeper", "c"]) expect(report.minutes.byPlayer.find((row) => row.playerKey === key)).toMatchObject({ keeperMinutes: 30, playingMinutes: 30, benchMinutes: 30 });
    input.secondKeeperKey = "keeper";
    expect(proposeCoachPlan(input).ok).toBe(false);
  });

  it("enforces a coach minute cap without leaking its private reason into the portable plan", () => {
    const input = inputFor(smallPlan);
    input.players[1].maxMinutes = 20; input.players[1].minutesReason = "team_agreement"; input.players[1].minutesNote = "Alleen voor de coach";
    const result = proposal(input);
    const report = validatePortableSubstitutionPlan(result.plan);
    expect(report.simulationComplete).toBe(true);
    expect(report.minutes.byPlayer.find((row) => row.playerKey === "a")?.playingMinutes).toBeLessThanOrEqual(20);
    expect(JSON.stringify(result.plan)).not.toMatch(/team_agreement|Alleen voor de coach|maxMinutes/);
    input.players[2].maxMinutes = 0; input.players[3].maxMinutes = 0;
    expect(proposeCoachPlan(input)).toMatchObject({ ok: false, errors: [expect.stringMatching(/onvoldoende speelminuten/)] });
  });

  it("uses actual historic duration and excludes impossible or unsplit keeper minutes", () => {
    const input = inputFor(smallPlan);
    const previous = history([65, 20, 50]);
    previous.playingDuration = 70;
    previous.players[1].keeperMinutes = null;
    previous.players[2].keeperMinutes = 60;
    input.history = [previous];
    const evidence = collectEvidence(input).evidence;
    expect(evidence.find((row) => row.playerKey === "a")).toMatchObject({ fieldMinutes: 65, eligibleFieldMinutes: 70 });
    expect(evidence.find((row) => row.playerKey === "b")?.fieldMinutes).toBeNull();
    expect(evidence.find((row) => row.playerKey === "c")?.fieldMinutes).toBeNull();
  });

  it("handles a remainder interval and clears obsolete source bank-minute expectations", () => {
    const input = inputFor();
    input.plan.match.regulationDurationMinutes = 55;
    input.intervalMinutes = 20;
    input.plan.players[0].sourceBenchMinutes = 99;
    const result = proposal(input);
    expect(result.plan.steps.map((step) => step.matchMinute)).toEqual([20, 40]);
    expect(result.plan.players[0].sourceBenchMinutes).toBeUndefined();
    expect(validatePortableSubstitutionPlan(result.plan).totals?.playingMinutes).toBe(605);
  });
});
