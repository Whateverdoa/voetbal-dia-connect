import { describe, expect, it } from "vitest";
import {
  validatePortableSubstitutionPlan,
  type PortableSubstitutionPlan,
} from "./validatePortableSubstitutionPlan";

function fixture(): PortableSubstitutionPlan {
  return {
    format: "dia-substitution-plan",
    version: 1,
    match: { regulationDurationMinutes: 60, fieldPlayerCountIncludingKeeper: 3, halftimeAtMinute: 30 },
    players: [
      { key: "g", name: "Keeper", number: 1, sourceBenchMinutes: null },
      { key: "a", name: "Speler A", number: 2, sourceBenchMinutes: 30 },
      { key: "b", name: "Speler B", number: 3, sourceBenchMinutes: 20 },
      { key: "c", name: "Speler C", number: 4, sourceBenchMinutes: 30 },
      { key: "d", name: "Speler D", number: 5, sourceBenchMinutes: 40 },
    ],
    formation: { slots: [{ id: 0, position: "GK" }, { id: 1, position: "LM" }, { id: 2, position: "CM" }] },
    startingLineup: {
      keeperKey: "g",
      field: [{ playerKey: "g", slotId: 0 }, { playerKey: "a", slotId: 1 }, { playerKey: "b", slotId: 2 }],
      bench: ["c", "d"],
    },
    steps: [
      { id: "s10", matchMinute: 10, actions: [{ id: "a10", kind: "substitution", playerOutKey: "a", playerInKey: "c" }], sourceBench: ["a", "d"] },
      { id: "s20", matchMinute: 20, actions: [{ id: "a20", kind: "substitution", playerOutKey: "b", playerInKey: "d" }], sourceBench: ["a", "b"] },
      { id: "s30", matchMinute: 30, actions: [{ id: "a30", kind: "substitution", playerOutKey: "c", playerInKey: "a" }], sourceBench: ["c", "b"] },
      { id: "s40", matchMinute: 40, actions: [{ id: "a40", kind: "substitution", playerOutKey: "d", playerInKey: "b" }], sourceBench: ["c", "d"] },
      { id: "s50", matchMinute: 50, actions: [
        { id: "a50", kind: "substitution", playerOutKey: "a", playerInKey: "c" },
        { id: "p50", kind: "positionSwap", playerOutKey: "b", playerInKey: "c" },
      ], sourceBench: ["a", "d"] },
    ],
    review: { sourceConfirmed: true, unresolved: [] },
  };
}

function codes(plan: unknown): string[] {
  return validatePortableSubstitutionPlan(plan).issues.map((issue) => issue.code);
}

function withoutSourceMinutes(plan: PortableSubstitutionPlan): PortableSubstitutionPlan {
  for (const player of plan.players) delete player.sourceBenchMinutes;
  for (const step of plan.steps) delete step.sourceBench;
  return plan;
}

describe("validatePortableSubstitutionPlan", () => {
  it("checks the full sequence, source bank lists, player totals and conservation without mutating input", () => {
    const plan = fixture();
    const original = JSON.stringify(plan);
    const report = validatePortableSubstitutionPlan(plan);
    expect(JSON.stringify(plan)).toBe(original);
    expect(report.issues).toEqual([]);
    expect(report.structurallyValid).toBe(true);
    expect(report.readyToPublish).toBe(true);
    expect(report.appIntegration.status).toBe("not-validated");
    expect(report.snapshots).toHaveLength(6);
    expect(report.snapshots.at(-1)?.field).toContainEqual({ playerKey: "b", slotId: 1 });
    expect(report.snapshots.at(-1)?.field).toContainEqual({ playerKey: "c", slotId: 2 });
    expect(report.minutes.scope).toBe("complete");
    expect(report.minutes.byPlayer.map((player) => [player.playerKey, player.playingMinutes, player.benchMinutes])).toEqual([
      ["g", 60, 0], ["a", 30, 30], ["b", 40, 20], ["c", 30, 30], ["d", 20, 40],
    ]);
    expect(report.minutes.byPlayer.every((player) => player.playingMinutes + player.benchMinutes === 60)).toBe(true);
    expect(report.totals).toEqual({ playingMinutes: 180, benchMinutes: 120, expectedPlayingMinutes: 180, expectedBenchMinutes: 120 });
    expect(report.sourceChecks).toEqual({ bankListsChecked: 5, playerMinutesChecked: 4, playerKeysWithoutSourceMinutes: ["g"] });
    expect(report.minutes.byPlayer[0].sourceBenchMatches).toBeNull();
    expect(report.distribution).toMatchObject({ minimumPlayingMinutes: 20, maximumPlayingMinutes: 40, playingGapMinutes: 20, keeperPlayerKeys: ["g"] });
  });

  it("reports a nominal field stint across halftime without adding break minutes", () => {
    const report = validatePortableSubstitutionPlan(fixture());
    expect(report.minutes.basis).toBe("nominal-playing-time-excluding-breaks");
    expect(report.minutes.byPlayer[0]).toMatchObject({ playingMinutes: 60, keeperMinutes: 60, longestFieldStintMinutesNominal: 60 });
    expect(report.minutes.byPlayer.find((player) => player.playerKey === "c")).toMatchObject({ longestFieldStintMinutesNominal: 20, longestBenchStintMinutesNominal: 20 });
  });

  it("rolls back an invalid step, stops later simulation and only returns valid-prefix minutes", () => {
    const plan = fixture();
    plan.steps[1].actions.push({ id: "broken", kind: "substitution", playerOutKey: "b", playerInKey: "a" });
    const report = validatePortableSubstitutionPlan(plan);
    expect(report.structurallyValid).toBe(false);
    expect(report.simulationComplete).toBe(false);
    expect(report.readyToPublish).toBe(false);
    expect(report.stoppedAt).toEqual({ stepId: "s20", actionId: "broken" });
    expect(report.snapshots).toHaveLength(2);
    expect(report.snapshots.at(-1)?.field).toContainEqual({ playerKey: "b", slotId: 2 });
    expect(report.snapshots.at(-1)?.bench).toContain("d");
    expect(report.minutes.scope).toBe("valid-prefix");
    expect(report.minutes.throughMinute).toBe(20);
    expect(report.minutes.byPlayer.every((player) => player.playingMinutes + player.benchMinutes === 20)).toBe(true);
    expect(report.minutes.byPlayer.every((player) => player.sourceBenchMatches === null)).toBe(true);
    expect(report.totals).toBeUndefined();
    expect(report.distribution).toBeUndefined();
  });

  it("does not silently reorder timestamps or extrapolate over a malformed timestamp", () => {
    const plan = fixture();
    plan.steps[1].matchMinute = 5;
    const report = validatePortableSubstitutionPlan(plan);
    expect(report.issues.some((issue) => issue.code === "STEP_OUT_OF_ORDER")).toBe(true);
    expect(report.minutes.throughMinute).toBe(10);
    expect(report.snapshots).toHaveLength(2);
    expect(report.totals).toBeUndefined();
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -1, 61])("rejects invalid substitution minute %s", (minute) => {
    const plan = fixture();
    plan.steps[0].matchMinute = minute;
    expect(codes(plan)).toContain("INVALID_STEP_MINUTE");
  });

  it("allows independent ordered steps at the same timestamp", () => {
    const plan = withoutSourceMinutes(fixture());
    plan.steps[1].matchMinute = 10;
    expect(validatePortableSubstitutionPlan(plan).structurallyValid).toBe(true);
  });

  it("accepts a substitution at kick-off and at the exact end without extra minutes", () => {
    const plan = withoutSourceMinutes(fixture());
    plan.steps[0].matchMinute = 0;
    plan.steps.at(-1)!.matchMinute = 60;
    const report = validatePortableSubstitutionPlan(plan);
    expect(report.structurallyValid).toBe(true);
    expect(report.totals?.playingMinutes).toBe(180);
  });

  it("rejects a bench-to-bench substitution", () => {
    const plan = fixture();
    plan.steps[0].actions[0].playerOutKey = "d";
    expect(codes(plan)).toContain("OUT_NOT_ON_FIELD");
  });

  it("rejects an incoming player already on the field", () => {
    const plan = fixture();
    plan.steps[0].actions[0].playerInKey = "b";
    expect(codes(plan)).toContain("IN_NOT_ON_BENCH");
  });

  it("rejects a position swap with a bench player", () => {
    const plan = fixture();
    plan.steps[0].actions[0].kind = "positionSwap";
    expect(codes(plan)).toContain("POSITION_SWAP_NOT_ON_FIELD");
  });

  it("rejects unknown and self-referencing players", () => {
    const unknown = fixture();
    unknown.steps[0].actions[0].playerInKey = "unknown";
    expect(codes(unknown)).toContain("UNKNOWN_ACTION_PLAYER");
    const self = fixture();
    self.steps[0].actions[0].playerInKey = "a";
    expect(codes(self)).toContain("SELF_SWAP");
  });

  it("rejects duplicate identities, slots and starting assignments", () => {
    const duplicatePlayer = fixture();
    duplicatePlayer.players[1].key = "g";
    expect(codes(duplicatePlayer)).toContain("DUPLICATE_PLAYER");
    const duplicateSlot = fixture();
    duplicateSlot.formation.slots[1].id = 0;
    expect(codes(duplicateSlot)).toContain("DUPLICATE_OR_INVALID_SLOT");
    const occupiedSlot = fixture();
    occupiedSlot.startingLineup.field[1].slotId = 0;
    expect(codes(occupiedSlot)).toContain("OCCUPIED_STARTING_SLOT");
    const shared = fixture();
    shared.startingLineup.bench.push("a");
    expect(codes(shared)).toContain("DUPLICATE_STARTING_PLAYER");
  });

  it("allows distinct keys sharing a display name", () => {
    const plan = fixture();
    plan.players[1].name = plan.players[2].name;
    expect(validatePortableSubstitutionPlan(plan).structurallyValid).toBe(true);
    expect(validatePortableSubstitutionPlan(plan).readyToPublish).toBe(true);
  });

  it("keeps Luc, Lucas and Lukas distinct and reports name plus shirt number", () => {
    const plan = fixture();
    plan.players[0].name = "Luc";
    plan.players[1].name = "Lucas";
    plan.players[2].name = "Lukas";
    const report = validatePortableSubstitutionPlan(plan);
    expect(report.readyToPublish).toBe(true);
    expect(report.minutes.byPlayer.slice(0, 3).map(({ playerKey, name, number, playingMinutes }) =>
      ({ playerKey, name, number, playingMinutes }))).toEqual([
      { playerKey: "g", name: "Luc", number: 1, playingMinutes: 60 },
      { playerKey: "a", name: "Lucas", number: 2, playingMinutes: 30 },
      { playerKey: "b", name: "Lukas", number: 3, playingMinutes: 40 },
    ]);
  });

  it.each([null, undefined])("requires review for an unknown shirt number (%s) while completing simulation", (number) => {
    const plan = fixture();
    plan.players[1].number = number;
    const report = validatePortableSubstitutionPlan(plan);
    expect(report.structurallyValid).toBe(true);
    expect(report.simulationComplete).toBe(true);
    expect(report.readyToPublish).toBe(false);
    expect(report.issues).toContainEqual(expect.objectContaining({ code: "MISSING_PLAYER_NUMBER", severity: "review", playerKeys: ["a"] }));
    expect(report.minutes.byPlayer[1]).toMatchObject({ number: null, playingMinutes: 30 });
    expect(report.totals?.playingMinutes).toBe(180);
  });

  it("requires review for duplicate shirt numbers without merging player identities", () => {
    const plan = fixture();
    plan.players[1].number = 3;
    plan.players[2].name = plan.players[1].name;
    const report = validatePortableSubstitutionPlan(plan);
    expect(report.structurallyValid).toBe(true);
    expect(report.readyToPublish).toBe(false);
    expect(report.issues).toContainEqual(expect.objectContaining({ code: "DUPLICATE_PLAYER_NUMBER", severity: "review", playerKeys: ["a", "b"] }));
    expect(report.minutes.byPlayer.filter((player) => player.number === 3).map((player) =>
      [player.playerKey, player.playingMinutes])).toEqual([["a", 30], ["b", 40]]);
  });

  it("does not use a shirt number as player identity or change calculations when numbers change", () => {
    const original = validatePortableSubstitutionPlan(fixture());
    const plan = fixture();
    plan.players[1].number = 3;
    plan.players[2].number = 2;
    const changed = validatePortableSubstitutionPlan(plan);
    expect(changed.readyToPublish).toBe(true);
    expect(changed.snapshots).toEqual(original.snapshots);
    expect(changed.minutes.byPlayer.map((player) => [player.playerKey, player.playingMinutes])).toEqual(
      original.minutes.byPlayer.map((player) => [player.playerKey, player.playingMinutes]),
    );
  });

  it.each([-1, 2.5, Number.NaN, Number.POSITIVE_INFINITY])("reviews invalid shirt number %s without blocking calculations", (number) => {
    const plan = fixture();
    plan.players[1].number = number;
    const report = validatePortableSubstitutionPlan(plan);
    expect(report.structurallyValid).toBe(true);
    expect(report.readyToPublish).toBe(false);
    expect(report.issues).toContainEqual(expect.objectContaining({ code: "INVALID_PLAYER_NUMBER", severity: "review", playerKeys: ["a"] }));
    expect(report.minutes.byPlayer[1].number).toBeNull();
  });

  it("accepts zero and large shirt numbers without an arbitrary upper limit", () => {
    const plan = fixture();
    plan.players[0].number = 0;
    plan.players[1].number = 1000;
    expect(validatePortableSubstitutionPlan(plan).readyToPublish).toBe(true);
  });

  it("checks shirt numbers only among the present selection", () => {
    const plan = fixture();
    plan.players.push({ key: "e", name: "Afwezig", number: 1, absent: true });
    plan.players.push({ key: "f", name: "Ook afwezig", number: null, absent: true });
    expect(validatePortableSubstitutionPlan(plan).readyToPublish).toBe(true);
  });

  it("rejects a string shirt number at the imported format boundary", () => {
    const plan = fixture();
    const input = { ...plan, players: plan.players.map((player) => ({ ...player, number: String(player.number) })) };
    expect(codes(input)).toEqual(["INVALID_FORMAT"]);
  });

  it("requires all present players to be assigned and excludes absent players", () => {
    const missing = fixture();
    missing.startingLineup.bench.pop();
    expect(codes(missing)).toContain("MISSING_STARTING_PLAYER");
    const absent = fixture();
    absent.players.push({ key: "e", name: "Afwezig", absent: true });
    expect(validatePortableSubstitutionPlan(absent).minutes.byPlayer).toHaveLength(5);
    absent.steps[0].actions[0].playerInKey = "e";
    expect(codes(absent)).toContain("ABSENT_ACTION_PLAYER");
    absent.startingLineup.bench.push("e");
    expect(codes(absent)).toContain("ABSENT_STARTING_PLAYER");
  });

  it("rejects duplicate step and globally duplicate action identities", () => {
    const step = fixture();
    step.steps[1].id = step.steps[0].id;
    expect(codes(step)).toContain("DUPLICATE_STEP");
    const action = fixture();
    action.steps[1].actions[0].id = action.steps[0].actions[0].id;
    expect(codes(action)).toContain("DUPLICATE_ACTION");
  });

  it("rejects a simultaneous reversal of a substitution", () => {
    const plan = fixture();
    plan.steps[0].actions.push({ id: "reverse", kind: "substitution", playerOutKey: "c", playerInKey: "a" });
    expect(codes(plan)).toContain("CONFLICTING_SIMULTANEOUS_SUBSTITUTION");
  });

  it("rejects a repeated same-minute position swap", () => {
    const plan = fixture();
    plan.steps.at(-1)!.actions.push({ id: "reverse", kind: "positionSwap", playerOutKey: "c", playerInKey: "b" });
    expect(codes(plan)).toContain("DUPLICATE_SIMULTANEOUS_POSITION_SWAP");
  });

  it("requires an explicit keeper assignment after a keeper change", () => {
    const plan = withoutSourceMinutes(fixture());
    plan.steps = [{ id: "keeper-change", matchMinute: 30, actions: [
      { id: "keeper-action", kind: "substitution", playerOutKey: "g", playerInKey: "c" },
    ] }];
    expect(codes(plan)).toContain("INVALID_KEEPER_AFTER_ACTION");
    plan.steps[0].actions[0].keeperKey = "c";
    const report = validatePortableSubstitutionPlan(plan);
    expect(report.structurallyValid).toBe(true);
    expect(report.distribution?.keeperPlayerKeys).toEqual(["g", "c"]);
    expect(report.minutes.byPlayer[0].keeperMinutes).toBe(30);
  });

  it("requires the assigned keeper to occupy GK at the start and after a position swap", () => {
    const start = fixture();
    start.startingLineup.keeperKey = "a";
    expect(codes(start)).toContain("INVALID_STARTING_KEEPER");
    const swap = withoutSourceMinutes(fixture());
    swap.steps = [{ id: "keeper-swap", matchMinute: 30, actions: [
      { id: "keeper-action", kind: "positionSwap", playerOutKey: "g", playerInKey: "a" },
    ] }];
    expect(codes(swap)).toContain("INVALID_KEEPER_AFTER_ACTION");
    swap.steps[0].actions[0].keeperKey = "a";
    expect(validatePortableSubstitutionPlan(swap).structurallyValid).toBe(true);
  });

  it("detects disagreement with source bank lists while preserving independent simulation", () => {
    const plan = fixture();
    plan.steps[0].sourceBench = ["a", "c"];
    const report = validatePortableSubstitutionPlan(plan);
    expect(report.structurallyValid).toBe(true);
    expect(report.readyToPublish).toBe(false);
    expect(report.issues).toContainEqual(expect.objectContaining({ code: "SOURCE_BENCH_MISMATCH", stepId: "s10" }));
    expect(report.sourceChecks.bankListsChecked).toBe(5);
  });

  it("rejects repeated source bank names, even when the set is unchanged", () => {
    const plan = fixture();
    plan.steps[0].sourceBench!.push("a");
    expect(codes(plan)).toContain("SOURCE_BENCH_MISMATCH");
  });

  it("compares reported bench minutes, including non-finite source totals", () => {
    const plan = fixture();
    plan.players[1].sourceBenchMinutes = 20;
    const report = validatePortableSubstitutionPlan(plan);
    expect(report.readyToPublish).toBe(false);
    expect(report.minutes.byPlayer[1].sourceBenchMatches).toBe(false);
    expect(report.issues).toContainEqual(expect.objectContaining({ code: "SOURCE_MINUTES_MISMATCH", playerKeys: ["a"] }));
    plan.players[1].sourceBenchMinutes = Number.NaN;
    expect(codes(plan)).toContain("SOURCE_MINUTES_MISMATCH");
  });

  it("keeps unresolved and unconfirmed source review separate from numerical validity", () => {
    const plan = fixture();
    plan.review = { sourceConfirmed: true, unresolved: ["Controleer de links/rechts-indeling"] };
    const unresolved = validatePortableSubstitutionPlan(plan);
    expect(unresolved.structurallyValid).toBe(true);
    expect(unresolved.readyToPublish).toBe(false);
    expect(codes(plan)).toContain("UNRESOLVED_REVIEW");
    plan.review = { unresolved: [] };
    expect(codes(plan)).toContain("SOURCE_REVIEW_REQUIRED");
    expect(validatePortableSubstitutionPlan(plan).readyToPublish).toBe(false);
  });

  it("does not make unequal minutes an error, and only warns for a configured gap", () => {
    const report = validatePortableSubstitutionPlan(fixture(), { maxFieldPlayerPlayingGapMinutes: 10 });
    expect(report.issues).toContainEqual(expect.objectContaining({ code: "PLAYING_GAP_EXCEEDS_LIMIT", severity: "warning" }));
    expect(report.readyToPublish).toBe(true);
    expect(codes(fixture())).not.toContain("PLAYING_GAP_EXCEEDS_LIMIT");
  });

  it.each([null, {}, { steps: [] }, { ...fixture(), version: 2 }, { ...fixture(), players: [null] }])("rejects malformed imported values without throwing", (input) => {
    expect(codes(input)).toEqual(["INVALID_FORMAT"]);
    expect(validatePortableSubstitutionPlan(input).totals).toBeUndefined();
  });

  it("rejects invalid duration, formation size and keeper slots before simulation", () => {
    const duration = fixture();
    duration.match.regulationDurationMinutes = Number.POSITIVE_INFINITY;
    expect(codes(duration)).toContain("INVALID_DURATION");
    const count = fixture();
    count.match.fieldPlayerCountIncludingKeeper = 4;
    expect(codes(count)).toContain("FORMATION_COUNT_MISMATCH");
    expect(codes(count)).toContain("STARTING_FIELD_COUNT");
    const keeper = fixture();
    keeper.formation.slots[0].position = "CB";
    expect(codes(keeper)).toContain("INVALID_KEEPER_SLOT");
  });
});
