import { describe, expect, it } from "vitest";
import { applyDemoCommand } from "./commands";
import { createDemoState } from "./fixtures";
import { applyObservationCommand, getStaffObservations, isObservationContent, isStaffObservation } from "./observationRules";
import { emptyObservation, OBSERVATION_CRITERIA, type ObservationCommand, type ObservationContent, type StaffObservation } from "./observationTypes";
import { canReadPlayer, getPlayerBadges, getPublishedFeedback, getWinners } from "./selectors";
import { isDemoState, parseSavedDemo } from "./storage";
import { emptyFeedback, type DemoActor, type DemoCommand, type DemoState } from "./types";

const now = Date.UTC(2026, 8, 20, 12);
const coach: DemoActor = { role: "coach" };
const scout: DemoActor = { role: "scout" };
const player: DemoActor = { role: "player", playerId: "p1" };
const parent: DemoActor = { role: "parent", guardianId: "family1" };

function completeContent(): ObservationContent {
  const content = emptyObservation("2026-09-19", "m2");
  content.position = "Centrale middenvelder";
  content.criteria.scanning = { level: "Passend bij de rol", evidence: "Keek in minuut 12 over de schouder voordat de pass aankwam." };
  content.strengths = "Herkent ruimte voordat de bal komt.";
  content.development = "Reactie bij balverlies opnieuw observeren.";
  content.followUp = "Observeer een omschakelvorm tijdens de volgende training.";
  return content;
}

function enabledState(): DemoState {
  return applyDemoCommand(createDemoState(now), coach, { type: "setObservationsEnabled", enabled: true }, now);
}

function save(state: DemoState, actor: DemoActor, id = "test-observation", content = completeContent(), playerId = "p1", timestamp = now): DemoState {
  return applyDemoCommand(state, actor, { type: "saveObservation", observationId: id, playerId, content }, timestamp);
}

function observation(state: DemoState, id = "test-observation"): StaffObservation {
  const result = state.observations?.find((item) => item.id === id);
  if (!result) throw new Error(`Expected observation ${id}`);
  return result;
}

function replaceStoredObservation(state: DemoState, changes: Record<string, unknown>): unknown {
  return { ...state, observations: [{ ...state.observations![0], ...changes }] };
}

describe("optional staff observation access", () => {
  it("starts disabled while keeping the example report invisible to every role", () => {
    const state = createDemoState(now);
    expect(state.observationsEnabled).toBe(false);
    expect(state.observations).toContainEqual(expect.objectContaining({ authorRole: "scout", status: "final" }));
    for (const actor of [coach, scout, player, parent]) {
      expect(getStaffObservations(state, actor)).toEqual([]);
      expect(getStaffObservations(state, actor, "p1")).toEqual([]);
    }
    expect(isDemoState(state)).toBe(true);
  });

  it("lets only the coach enable and disable the feature without deleting reports", () => {
    const initial = createDemoState(now);
    const enabled = applyDemoCommand(initial, coach, { type: "setObservationsEnabled", enabled: true }, now);
    expect(getStaffObservations(enabled, scout)).toHaveLength(1);
    const disabled = applyDemoCommand(enabled, coach, { type: "setObservationsEnabled", enabled: false }, now + 1);
    expect(disabled.observationsEnabled).toBe(false);
    expect(disabled.observations).toEqual(initial.observations);
    expect(getStaffObservations(disabled, coach)).toEqual([]);
    expect(getStaffObservations(disabled, scout)).toEqual([]);
    const restored = applyDemoCommand(disabled, coach, { type: "setObservationsEnabled", enabled: true }, now + 2);
    expect(getStaffObservations(restored, coach)).toEqual(getStaffObservations(enabled, coach));
  });

  it.each([scout, player, parent])("rejects direct feature toggles by $role", (actor) => {
    for (const enabled of [true, false]) {
      const command: ObservationCommand = { type: "setObservationsEnabled", enabled };
      expect(() => applyDemoCommand(enabledState(), actor, command, now)).toThrow("Alleen de coach");
      expect(() => applyObservationCommand(enabledState(), actor, command, now)).toThrow("Alleen de coach");
    }
  });

  it.each([coach, scout])("blocks $role reads, saves and finalization while disabled, even through the direct helper", (actor) => {
    const saved = save(enabledState(), actor);
    const disabled = applyDemoCommand(saved, coach, { type: "setObservationsEnabled", enabled: false }, now);
    const original = structuredClone(disabled);
    const commands: ObservationCommand[] = [
      { type: "saveObservation", observationId: "test-observation", playerId: "p1", content: completeContent() },
      { type: "saveObservation", observationId: "new-report", playerId: "p1", content: completeContent() },
      { type: "finalizeObservation", observationId: "test-observation" },
    ];
    for (const command of commands) {
      expect(() => applyDemoCommand(disabled, actor, command, now)).toThrow("nog niet aangezet");
      expect(() => applyObservationCommand(disabled, actor, command, now)).toThrow("nog niet aangezet");
    }
    expect(getStaffObservations(disabled, actor)).toEqual([]);
    expect(disabled).toEqual(original);
  });

  it.each([player, parent])("denies $role observation reads and commands even when enabled", (actor) => {
    const state = save(enabledState(), coach);
    expect(getStaffObservations(state, actor)).toEqual([]);
    expect(getStaffObservations(state, actor, "p1")).toEqual([]);
    for (const command of [
      { type: "saveObservation", observationId: "family-report", playerId: "p1", content: completeContent() },
      { type: "finalizeObservation", observationId: "test-observation" },
    ] satisfies ObservationCommand[]) {
      expect(() => applyDemoCommand(state, actor, command, now)).toThrow("alleen voor coaches en scouts");
      expect(() => applyObservationCommand(state, actor, command, now)).toThrow("alleen voor coaches en scouts");
    }
  });

  it("does not give scouts access to family feedback, voting or coach administration", () => {
    const state = enabledState();
    expect(canReadPlayer(state, scout, "p1")).toBe(false);
    expect(getPublishedFeedback(state, scout, "p1")).toEqual([]);
    const commands: DemoCommand[] = [
      { type: "saveFeedback", playerId: "p1", kind: "periodic", content: emptyFeedback() },
      { type: "publishFeedback", feedbackId: "f1" },
      { type: "addHighlight", matchId: "m1", playerId: "p2", category: "Redding", description: "Mooie redding." },
      { type: "reviewHighlight", highlightId: "h2", approved: true },
      { type: "openVoting", matchId: "m1" },
      { type: "closeVoting", matchId: "m2" },
      { type: "castVote", matchId: "m2", kind: "player", targetId: "p2", reason: "Hielp het team" },
    ];
    for (const command of commands) expect(() => applyDemoCommand(state, scout, command, now)).toThrow();
  });
});

describe("staff draft ownership and final reports", () => {
  it("keeps drafts with their author role and shares final reports between staff only", () => {
    const coachDraft = save(enabledState(), coach, "coach-draft", completeContent(), "p1", now + 1);
    const bothDrafts = save(coachDraft, scout, "scout-draft", completeContent(), "p2", now + 2);
    const originalOrder = bothDrafts.observations!.map((item) => item.id);
    expect(getStaffObservations(bothDrafts, coach).map((item) => item.id)).toEqual(["coach-draft", "observation-example"]);
    expect(getStaffObservations(bothDrafts, scout).map((item) => item.id)).toEqual(["scout-draft", "observation-example"]);
    expect(getStaffObservations(bothDrafts, coach, "p2")).toEqual([]);
    expect(bothDrafts.observations!.map((item) => item.id)).toEqual(originalOrder);

    const finalized = applyDemoCommand(bothDrafts, scout, { type: "finalizeObservation", observationId: "scout-draft" }, now + 3);
    expect(getStaffObservations(finalized, coach).map((item) => item.id)).toEqual(["scout-draft", "coach-draft", "observation-example"]);
    expect(getStaffObservations(finalized, coach, "p2")).toEqual([observation(finalized, "scout-draft")]);
    expect(getStaffObservations(finalized, scout, "missing-player")).toEqual([]);
    expect(getStaffObservations(finalized, player)).toEqual([]);
    expect(getStaffObservations(finalized, parent)).toEqual([]);
  });

  it("updates only the author's existing draft and snapshots nested content without mutating the input", () => {
    const initial = enabledState();
    const original = structuredClone(initial);
    const content = completeContent();
    content.position = "  Middenvelder  ";
    content.strengths = "  Ziet vrije ruimte.  ";
    content.criteria.scanning.evidence = "  Kijkt eerst om zich heen.  ";
    const saved = save(initial, coach, "draft", content);
    const savedContent = structuredClone(observation(saved, "draft").content);
    content.criteria.scanning.evidence = "Changed after dispatch";
    expect(observation(saved, "draft").content).toEqual(savedContent);
    expect(observation(saved, "draft").content.position).toBe("Middenvelder");
    expect(observation(saved, "draft").content.criteria.scanning.evidence).toBe("Kijkt eerst om zich heen.");
    expect(initial).toEqual(original);

    const editedContent = completeContent();
    editedContent.followUp = "Volgende week nogmaals observeren.";
    const edited = save(saved, coach, "draft", editedContent, "p1", now + 100);
    expect(edited.observations!.filter((item) => item.id === "draft")).toHaveLength(1);
    expect(observation(edited, "draft")).toMatchObject({ authorRole: "coach", status: "draft", createdAt: now, updatedAt: now + 100 });
    expect(observation(saved, "draft").content).toEqual(savedContent);
  });

  it.each([[coach, scout], [scout, coach]])("does not let another staff role steal or finalize a draft", (owner, other) => {
    const state = save(enabledState(), owner);
    const original = structuredClone(state);
    expect(() => save(state, other)).toThrow("eigen concepten");
    expect(() => applyDemoCommand(state, other, { type: "finalizeObservation", observationId: "test-observation" }, now)).toThrow("eigen concepten");
    expect(state).toEqual(original);
  });

  it("derives ownership and draft status from the actor, ignoring injected command metadata", () => {
    const command = { type: "saveObservation" as const, observationId: "metadata-attempt", playerId: "p1", content: completeContent(), authorRole: "scout", status: "final" };
    const saved = applyDemoCommand(enabledState(), coach, command, now);
    expect(observation(saved, "metadata-attempt")).toMatchObject({ authorRole: "coach", status: "draft" });
  });

  it("does not reassign an existing report to a different player", () => {
    const state = save(enabledState(), coach);
    expect(() => save(state, coach, "test-observation", completeContent(), "p2")).toThrow("dezelfde speler");
    expect(observation(state).playerId).toBe("p1");
  });

  it.each([coach, scout])("makes finalized $role reports immutable and uses a new report for follow-up", (actor) => {
    const saved = save(enabledState(), actor);
    const finalized = applyDemoCommand(saved, actor, { type: "finalizeObservation", observationId: "test-observation" }, now + 1);
    const original = structuredClone(observation(finalized));
    expect(() => save(finalized, actor)).toThrow("vastgelegd");
    expect(() => applyDemoCommand(finalized, actor, { type: "finalizeObservation", observationId: "test-observation" }, now + 2)).toThrow("vastgelegd");
    const followUp = save(finalized, actor, "follow-up", completeContent(), "p1", now + 3);
    expect(observation(followUp)).toEqual(original);
    expect(observation(followUp, "follow-up").status).toBe("draft");
    expect(observation(saved).status).toBe("draft");
  });

  it("requires a saved draft before finalization", () => {
    expect(() => applyDemoCommand(enabledState(), coach, { type: "finalizeObservation", observationId: "missing" }, now)).toThrow("Bewaar eerst");
  });
});

describe("observation validity and evidence", () => {
  it("allows incomplete drafts but requires at least one assessed criterion to finalize", () => {
    const content = emptyObservation("2026-09-20");
    expect(isObservationContent(content)).toBe(true);
    const draft = save(enabledState(), scout, "incomplete", content);
    expect(isStaffObservation(observation(draft, "incomplete"))).toBe(true);
    expect(() => applyDemoCommand(draft, scout, { type: "finalizeObservation", observationId: "incomplete" }, now)).toThrow("Onderbouw minstens één");

    const noAssessment = completeContent();
    noAssessment.criteria = emptyObservation("2026-09-20").criteria;
    const readyExceptEvidence = save(enabledState(), coach, "no-assessment", noAssessment);
    expect(() => applyDemoCommand(readyExceptEvidence, coach, { type: "finalizeObservation", observationId: "no-assessment" }, now)).toThrow("Onderbouw minstens één");
  });

  it.each(OBSERVATION_CRITERIA)("requires concrete evidence for an assessed $id criterion", ({ id }) => {
    const content = completeContent();
    content.criteria[id] = { level: "In ontwikkeling", evidence: "   " };
    const saved = save(enabledState(), coach, "missing-evidence", content);
    expect(() => applyDemoCommand(saved, coach, { type: "finalizeObservation", observationId: "missing-evidence" }, now)).toThrow("elke ingevulde beoordeling");
    expect(observation(saved, "missing-evidence").status).toBe("draft");
  });

  it.each(["position", "strengths", "development", "followUp"] as const)("requires a nonempty %s before finalizing", (field) => {
    const content = completeContent();
    content[field] = " \n ";
    const saved = save(enabledState(), coach, "missing-summary", content);
    expect(() => applyDemoCommand(saved, coach, { type: "finalizeObservation", observationId: "missing-summary" }, now)).toThrow("Vul de positie");
  });

  it("finalizes valid evidence without requiring assessments of unobserved criteria", () => {
    const saved = save(enabledState(), scout);
    const finalized = applyDemoCommand(saved, scout, { type: "finalizeObservation", observationId: "test-observation" }, now + 10);
    expect(observation(finalized)).toMatchObject({ status: "final", updatedAt: now + 10, content: { confidence: "Eerste indruk" } });
    expect(observation(finalized).content.criteria.passing).toEqual({ level: "Niet geobserveerd", evidence: "" });
    expect(isStaffObservation(observation(finalized))).toBe(true);
    expect(parseSavedDemo(JSON.stringify(finalized))).toEqual(finalized);
  });

  it("accepts a training context without a match and rejects missing, unknown or unrelated match participants", () => {
    const seed = enabledState();
    seed.matches.push({ id: "other-match", opponent: "Ander team", score: "0–0", dateLabel: "Vandaag", phase: "preparing", participantIds: ["p2"] });
    expect(() => save(seed, coach, "unknown-player", completeContent(), "unknown")).toThrow("Speler niet gevonden");
    expect(() => save(seed, coach, "wrong-match", { ...completeContent(), matchId: "missing" })).toThrow("waaraan deze speler deelnam");
    expect(() => save(seed, coach, "nonparticipant", { ...completeContent(), matchId: "other-match" })).toThrow("waaraan deze speler deelnam");
    expect(() => save(seed, coach, "no-match", { ...completeContent(), matchId: undefined })).toThrow("Controleer");
    expect(() => save(seed, coach, "training-with-match", { ...completeContent(), context: "training" })).toThrow("Controleer");
    const training = { ...completeContent(), context: "training" as const, matchId: undefined };
    expect(isDemoState(save(seed, coach, "training", training))).toBe(true);
  });

  it.each([0, 4, 121, -1, 30.5, Number.NaN, Number.POSITIVE_INFINITY])("rejects invalid observed duration %s", (minutes) => {
    const content = { ...completeContent(), minutes };
    expect(isObservationContent(content)).toBe(false);
    expect(() => save(enabledState(), coach, "invalid-duration", content)).toThrow("duur");
  });

  it.each([5, 120])("accepts the inclusive duration boundary %s", (minutes) => {
    const state = save(enabledState(), coach, "duration-boundary", { ...completeContent(), minutes });
    expect(observation(state, "duration-boundary").content.minutes).toBe(minutes);
    expect(parseSavedDemo(JSON.stringify(state))).toEqual(state);
  });

  it.each(["2026-02-29", "2026-02-30", "2026-04-31", "2026-13-01", "2026-00-10", "2026-9-20", "20-09-2026", "2026-09-20T12:00:00Z", "", "nonsense"])("rejects invalid observation date %s", (observedOn) => {
    const content = { ...completeContent(), observedOn };
    expect(isObservationContent(content)).toBe(false);
    expect(() => save(enabledState(), coach, "invalid-date", content)).toThrow("observatiedatum");
  });

  it("accepts a genuine leap day", () => {
    expect(isObservationContent({ ...completeContent(), observedOn: "2024-02-29" })).toBe(true);
  });

  it("rejects array contexts instead of coercing them into valid strings", () => {
    const malformed = { ...completeContent(), context: ["training"], matchId: undefined };
    expect(isObservationContent(malformed)).toBe(false);
    expect(() => save(enabledState(), coach, "invalid-context", malformed as unknown as ObservationContent)).toThrow("Controleer");
  });

  it.each(["", "with spaces", "../report", "a".repeat(101)])("rejects invalid observation ID %s", (id) => {
    expect(() => save(enabledState(), coach, id)).toThrow("Ongeldige observatie");
  });

  it.each(["position", "strengths", "development", "followUp", "evidence"] as const)("rejects oversized %s text", (field) => {
    const content = completeContent();
    if (field === "evidence") content.criteria.scanning.evidence = "x".repeat(601);
    else content[field] = "x".repeat(field === "position" ? 81 : 1201);
    expect(isObservationContent(content)).toBe(false);
    expect(() => save(enabledState(), coach, "oversized", content)).toThrow("ingevulde teksten");
  });
});

describe("observation persistence compatibility and isolation", () => {
  it("loads older v1 browser data without optional fields, leaves the feature off and preserves existing data on first use", () => {
    const oldState = createDemoState(now);
    delete oldState.observationsEnabled;
    delete oldState.observations;
    const parsed = parseSavedDemo(JSON.stringify(oldState));
    expect(parsed).toEqual(oldState);
    expect(parsed?.observationsEnabled).toBeUndefined();
    expect(getStaffObservations(parsed!, coach)).toEqual([]);
    expect(() => save(parsed!, coach)).toThrow("nog niet aangezet");
    const enabled = applyDemoCommand(parsed!, coach, { type: "setObservationsEnabled", enabled: true }, now);
    const saved = save(enabled, scout);
    expect(saved.observations).toHaveLength(1);
    expect(saved.feedback).toEqual(oldState.feedback);
    expect(saved.votes).toEqual(oldState.votes);
    expect(parseSavedDemo(JSON.stringify(saved))).toEqual(saved);
  });

  const corruptStates: [string, (state: DemoState) => unknown][] = [
    ["nonboolean feature flag", (state) => ({ ...state, observationsEnabled: "true" })],
    ["nonarray observations", (state) => ({ ...state, observations: {} })],
    ["null observation", (state) => ({ ...state, observations: [null] })],
    ["duplicate report IDs", (state) => ({ ...state, observations: [state.observations![0], state.observations![0]] })],
    ["invalid report ID", (state) => replaceStoredObservation(state, { id: "../report" })],
    ["unknown player", (state) => replaceStoredObservation(state, { playerId: "missing-player" })],
    ["unknown match", (state) => replaceStoredObservation(state, { content: { ...completeContent(), matchId: "missing-match" } })],
    ["unrelated match", (state) => ({ ...state, matches: [...state.matches, { id: "only-p2", opponent: "Ander", dateLabel: "Vandaag", score: "0–0", phase: "preparing", participantIds: ["p2"] }], observations: [{ ...state.observations![0], content: { ...completeContent(), matchId: "only-p2" } }] })],
    ["unauthorized author", (state) => replaceStoredObservation(state, { authorRole: "player" })],
    ["unknown report status", (state) => replaceStoredObservation(state, { status: "published" })],
    ["missing content", (state) => replaceStoredObservation(state, { content: null })],
    ["array context", (state) => replaceStoredObservation(state, { content: { ...completeContent(), context: ["training"], matchId: undefined } })],
    ["training with match reference", (state) => replaceStoredObservation(state, { content: { ...completeContent(), context: "training" } })],
    ["fractional duration", (state) => replaceStoredObservation(state, { content: { ...completeContent(), minutes: 12.5 } })],
    ["invalid calendar date", (state) => replaceStoredObservation(state, { content: { ...completeContent(), observedOn: "2026-02-30" } })],
    ["unknown confidence", (state) => replaceStoredObservation(state, { content: { ...completeContent(), confidence: "Absoluut zeker" } })],
    ["missing criteria", (state) => replaceStoredObservation(state, { content: { ...completeContent(), criteria: {} } })],
    ["unknown criterion level", (state) => replaceStoredObservation(state, { content: { ...completeContent(), criteria: { ...completeContent().criteria, scanning: { level: "Elite", evidence: "Een moment." } } } })],
    ["nontextual evidence", (state) => replaceStoredObservation(state, { content: { ...completeContent(), criteria: { ...completeContent().criteria, scanning: { level: "In ontwikkeling", evidence: 42 } } } })],
    ["final without evidence", (state) => replaceStoredObservation(state, { content: { ...completeContent(), criteria: emptyObservation("2026-09-20").criteria } })],
    ["final without follow-up", (state) => replaceStoredObservation(state, { content: { ...completeContent(), followUp: "  " } })],
    ["missing creation timestamp", (state) => replaceStoredObservation(state, { createdAt: undefined })],
    ["nonfinite updated timestamp", (state) => replaceStoredObservation(state, { updatedAt: Number.POSITIVE_INFINITY })],
  ];

  it.each(corruptStates)("rejects saved observations with %s", (_label, corrupt) => {
    const invalidState = corrupt(createDemoState(now));
    expect(isDemoState(invalidState)).toBe(false);
    expect(parseSavedDemo(JSON.stringify(invalidState))).toBeNull();
  });

  it("preserves votes, winners, badges and all family feedback through the complete staff lifecycle", () => {
    const initial = createDemoState(now);
    const familyView = (state: DemoState) => ({
      players: state.players, guardians: state.guardians, matches: state.matches,
      votes: state.votes, highlights: state.highlights, feedback: state.feedback,
      familyFeedback: getPublishedFeedback(state, parent, "p1"),
      ownFeedback: getPublishedFeedback(state, player, "p1"),
      badges: getPlayerBadges(state, "p1", now),
      winners: state.matches.map((match) => getWinners(state, match.id, now)),
    });
    const baseline = structuredClone(familyView(initial));
    const enabled = applyDemoCommand(initial, coach, { type: "setObservationsEnabled", enabled: true }, now);
    const content = completeContent();
    content.strengths = "Vertrouwelijke stafobservatie.";
    const saved = save(enabled, scout, "staff-only", content);
    const finalized = applyDemoCommand(saved, scout, { type: "finalizeObservation", observationId: "staff-only" }, now + 10);
    const disabled = applyDemoCommand(finalized, coach, { type: "setObservationsEnabled", enabled: false }, now + 20);
    const restored = applyDemoCommand(disabled, coach, { type: "setObservationsEnabled", enabled: true }, now + 30);
    for (const state of [initial, enabled, saved, finalized, disabled, restored]) {
      expect(familyView(state)).toEqual(baseline);
      expect(getStaffObservations(state, player)).toEqual([]);
      expect(getStaffObservations(state, parent)).toEqual([]);
      expect(parseSavedDemo(JSON.stringify(state))).toEqual(state);
    }
    expect(observation(restored, "staff-only")).toEqual(observation(finalized, "staff-only"));
  });
});
