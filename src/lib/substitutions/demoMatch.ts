import {
  validatePortableSubstitutionPlan,
  type PortablePlanSnapshot,
  type PortableSubstitutionPlan,
} from "./validatePortableSubstitutionPlan";

type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

export type DemoPhase = "ready" | "running" | "paused" | "halftime" | "finished";
export type DemoStepStatus = "pending" | "executed" | "skipped";
export type DemoAction = DeepReadonly<PortableSubstitutionPlan["steps"][number]["actions"][number]>;

export interface DemoFormationState {
  readonly id?: string;
  readonly name?: string;
  readonly slots: readonly {
    readonly id: number;
    readonly position: string;
    readonly x?: number;
    readonly y?: number;
  }[];
}

export interface DemoEventSnapshot {
  readonly field: readonly { readonly playerKey: string; readonly slotId: number }[];
  readonly bench: readonly string[];
  readonly keeperKey: string;
  readonly formation: DemoFormationState;
}

export interface DemoEvent {
  readonly id: string;
  readonly type: "planned" | "manual" | "skipped" | "formation";
  readonly elapsedSeconds: number;
  readonly stepId?: string;
  readonly plannedMinute?: number;
  readonly actions: readonly DemoAction[];
  readonly formation?: DemoFormationState;
  /** Actual field state immediately after this event, never reconstructed from the later state. */
  readonly snapshot: DemoEventSnapshot;
}

/** Local demonstration only: no database IDs, persistence, wall clock, or network writes. */
export interface DemoMatchState extends DemoEventSnapshot {
  readonly plan: DeepReadonly<PortableSubstitutionPlan>;
  readonly elapsedSeconds: number;
  readonly phase: DemoPhase;
  readonly halftimeTaken: boolean;
  readonly secondsPlayed: Readonly<Record<string, number>>;
  readonly stepStatus: Readonly<Record<string, DemoStepStatus>>;
  readonly completedActionIds: readonly string[];
  readonly events: readonly DemoEvent[];
  readonly plannedSnapshots: readonly DeepReadonly<PortablePlanSnapshot>[];
  readonly plannedSeconds: Readonly<Record<string, number>>;
}

export interface DemoPlayerComparison {
  playerKey: string;
  name: string;
  number: number | null;
  onField: boolean;
  slotId: number | null;
  plannedMinutes: number;
  plannedMinutesSoFar: number;
  actualMinutes: number;
  actualBenchMinutes: number;
  /** Comparison at the same elapsed playing time, meaningful while the demo is running. */
  deltaMinutes: number;
  /** Only a final result when phase is finished; earlier it is a difference from the full plan. */
  finalDeltaMinutes: number;
}

function freeze<T>(value: T): T {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

export function createDemoMatch(plan: PortableSubstitutionPlan): DemoMatchState {
  const report = validatePortableSubstitutionPlan(plan);
  const error = report.issues.find((issue) => issue.severity === "error");
  if (!report.structurallyValid || !report.simulationComplete || error) {
    throw new Error(error?.message ?? "Controleer het wisselplan voordat de demo start.");
  }
  if (!Number.isSafeInteger(plan.match.regulationDurationMinutes * 60) ||
      (plan.match.halftimeAtMinute != null && !Number.isSafeInteger(plan.match.halftimeAtMinute * 60))) {
    throw new Error("De demo gebruikt hele seconden voor de wedstrijdduur en rust.");
  }
  // Clone before freezing so neither the caller's source nor its review status is changed.
  const source = structuredClone(plan);
  return freeze({
    plan: source,
    elapsedSeconds: 0,
    phase: "ready",
    halftimeTaken: false,
    formation: structuredClone(source.formation),
    field: source.startingLineup.field.map((entry) => ({ ...entry })),
    bench: [...source.startingLineup.bench],
    keeperKey: source.startingLineup.keeperKey,
    secondsPlayed: Object.fromEntries(source.players.filter((player) => !player.absent).map((player) => [player.key, 0])),
    stepStatus: Object.fromEntries(source.steps.map((step) => [step.id, "pending" as const])),
    completedActionIds: [],
    events: [],
    plannedSnapshots: report.snapshots,
    plannedSeconds: Object.fromEntries(report.minutes.byPlayer.map((player) => [player.playerKey, player.playingMinutes * 60])),
  });
}

export function startDemoClock(state: DemoMatchState): DemoMatchState {
  if (state.phase === "finished" || state.phase === "running") return state;
  return freeze({ ...state, phase: "running" });
}

export function pauseDemoClock(state: DemoMatchState): DemoMatchState {
  return state.phase === "running" ? freeze({ ...state, phase: "paused" }) : state;
}

/** Advances only playing time. Crossing halftime stops there and discards the excess tick. */
export function advanceDemoClock(state: DemoMatchState, seconds: number): DemoMatchState {
  if (!Number.isSafeInteger(seconds) || seconds < 0) {
    throw new Error("Verplaats de demoklok met een positief geheel aantal seconden.");
  }
  if (state.phase !== "running" || seconds === 0) return state;
  const endSecond = state.plan.match.regulationDurationMinutes * 60;
  const halftimeSecond = state.plan.match.halftimeAtMinute == null
    ? null : state.plan.match.halftimeAtMinute * 60;
  const nextStop = !state.halftimeTaken && halftimeSecond !== null ? halftimeSecond : endSecond;
  const elapsedSeconds = Math.min(nextStop, state.elapsedSeconds + seconds);
  const delta = elapsedSeconds - state.elapsedSeconds;
  const secondsPlayed = { ...state.secondsPlayed };
  for (const entry of state.field) secondsPlayed[entry.playerKey] += delta;
  const atHalftime = elapsedSeconds === halftimeSecond && !state.halftimeTaken;
  const phase: DemoPhase = elapsedSeconds === endSecond ? "finished" : atHalftime ? "halftime" : "running";
  return freeze({
    ...state, elapsedSeconds, secondsPlayed, phase,
    halftimeTaken: state.halftimeTaken || atHalftime,
  });
}

/**
 * Advances through each planned moment so playing time belongs to the players
 * actually on the field between actions. Late activation never rewrites history.
 * A conflicting step is atomic; earlier successful steps and elapsed time remain.
 */
export function advanceDemoClockFollowingPlan(
  state: DemoMatchState,
  seconds: number,
): { match: DemoMatchState; error: string | null } {
  if (!Number.isSafeInteger(seconds) || seconds < 0) {
    throw new Error("Verplaats de demoklok met een positief geheel aantal seconden.");
  }
  if (state.phase !== "running" || seconds === 0) return { match: state, error: null };

  const endSecond = state.plan.match.regulationDurationMinutes * 60;
  const halftimeSecond = state.plan.match.halftimeAtMinute == null
    ? null : state.plan.match.halftimeAtMinute * 60;
  const nextStop = !state.halftimeTaken && halftimeSecond !== null ? halftimeSecond : endSecond;
  const targetSecond = Math.min(nextStop, state.elapsedSeconds + seconds);
  let match = state;

  for (const step of state.plan.steps) {
    if (match.stepStatus[step.id] !== "pending") continue;
    const scheduledSecond = step.matchMinute * 60;
    const executionSecond = Math.max(state.elapsedSeconds, scheduledSecond);
    if (executionSecond > targetSecond) break;
    if (!Number.isSafeInteger(scheduledSecond)) {
      return {
        match: freeze({ ...match, phase: "paused" }),
        error: `Wisselmoment op minuut ${step.matchMinute} kan niet automatisch worden uitgevoerd: kies een tijdstip op een hele seconde.`,
      };
    }
    match = advanceDemoClock(match, executionSecond - match.elapsedSeconds);
    const phase = match.phase;
    try {
      // A plan may contain a final-whistle action. Apply it before closing the
      // match, while retaining the normal prohibition on manual finished edits.
      const active = phase === "finished" ? freeze({ ...match, phase: "paused" as const }) : match;
      const executed = executeDemoStep(active, step.id);
      match = phase === "finished" ? freeze({ ...executed, phase }) : executed;
    } catch (error) {
      return {
        match: freeze({ ...match, phase: "paused" }),
        error: `Wisselmoment op minuut ${step.matchMinute} kan niet automatisch worden uitgevoerd: ${error instanceof Error ? error.message : "Controleer de opstelling en de eerdere wissels."}`,
      };
    }
  }

  return { match: advanceDemoClock(match, targetSecond - match.elapsedSeconds), error: null };
}

function assertActive(state: DemoMatchState): void {
  if (state.phase === "ready" || state.phase === "finished") {
    throw new Error(state.phase === "ready" ? "Start eerst de demowedstrijd." : "De demowedstrijd is afgelopen.");
  }
}

function pendingStep(state: DemoMatchState, stepId: string) {
  const step = state.plan.steps.find((candidate) => candidate.id === stepId);
  if (!step) throw new Error("Dit wisselmoment bestaat niet.");
  if (state.stepStatus[stepId] !== "pending") throw new Error("Dit wisselmoment is al uitgevoerd of overgeslagen.");
  return step;
}

/** Every action is checked against the current demo field; a failed group commits nothing. */
function applyActions(state: DemoMatchState, actions: readonly DemoAction[]) {
  const field = new Map(state.field.map((entry) => [entry.playerKey, entry.slotId]));
  const bench = new Set(state.bench);
  const eligible = new Set(state.plan.players.filter((player) => !player.absent).map((player) => player.key));
  // Existing development sessions may predate the live-formation field during hot reload.
  const keeperSlot = (state.formation ?? state.plan.formation).slots.find((slot) => slot.position === "GK")?.id;
  const substituted = new Set<string>();
  const positionPairs = new Set<string>();
  let keeperKey = state.keeperKey;
  for (const action of actions) {
    const { playerOutKey: out, playerInKey: incoming } = action;
    if (out === incoming) throw new Error("Een speler kan niet met zichzelf wisselen.");
    if (!eligible.has(out) || !eligible.has(incoming)) throw new Error("Kies twee aanwezige spelers uit deze selectie.");
    const outSlot = field.get(out);
    if (outSlot === undefined) throw new Error("De uitgaande speler staat nu niet op het veld. Controleer de eerdere wissels.");
    if (action.kind === "substitution") {
      if (!bench.has(incoming)) throw new Error("De invaller staat nu niet op de bank. Controleer de eerdere wissels.");
      if (substituted.has(out) || substituted.has(incoming)) throw new Error("Een speler komt dubbel voor in dit wisselmoment.");
      field.delete(out);
      field.set(incoming, outSlot);
      bench.delete(incoming);
      bench.add(out);
      substituted.add(out);
      substituted.add(incoming);
    } else {
      const inSlot = field.get(incoming);
      if (inSlot === undefined) throw new Error("Voor een positiewissel moeten beide spelers op het veld staan.");
      const pair = JSON.stringify([out, incoming].sort());
      if (positionPairs.has(pair)) throw new Error("Deze positiewissel staat dubbel in hetzelfde wisselmoment.");
      positionPairs.add(pair);
      field.set(out, inSlot);
      field.set(incoming, outSlot);
    }
    if (action.keeperKey !== undefined) keeperKey = action.keeperKey;
    if (keeperSlot === undefined || field.get(keeperKey) !== keeperSlot) {
      throw new Error("Wijs bij deze wissel de speler op de keeperpositie aan als keeper.");
    }
  }
  if (field.size !== state.plan.match.fieldPlayerCountIncludingKeeper ||
      new Set(field.values()).size !== field.size || field.size + bench.size !== eligible.size ||
      [...field.keys()].some((key) => bench.has(key))) {
    throw new Error("Deze wissels leveren een ongeldige veld- of bankbezetting op.");
  }
  return { field: [...field].map(([playerKey, slotId]) => ({ playerKey, slotId })), bench: [...bench], keeperKey };
}

function recordEvent(
  state: DemoMatchState,
  event: Omit<DemoEvent, "id" | "elapsedSeconds" | "snapshot">,
  after: DemoEventSnapshot = state,
): readonly DemoEvent[] {
  return [...state.events, {
    ...event, id: `demo-event-${state.events.length + 1}`, elapsedSeconds: state.elapsedSeconds,
    actions: event.actions.map((action) => ({ ...action })),
    snapshot: {
      field: after.field.map((entry) => ({ ...entry })),
      bench: [...after.bench],
      keeperKey: after.keeperKey,
      formation: structuredClone(after.formation ?? state.plan.formation),
    },
  }];
}

function executePlanActions(
  state: DemoMatchState,
  step: DemoMatchState["plan"]["steps"][number],
  actions: readonly DemoAction[],
): DemoMatchState {
  const nextField = applyActions(state, actions);
  const completedActionIds = [...(state.completedActionIds ?? []), ...actions.map((action) => action.id)];
  const status = step.actions.every((action) => completedActionIds.includes(action.id)) ? "executed" : "pending";
  return freeze({
    ...state, ...nextField, completedActionIds,
    stepStatus: { ...state.stepStatus, [step.id]: status },
    events: recordEvent(state, { type: "planned", stepId: step.id, plannedMinute: step.matchMinute, actions }, { ...state, ...nextField }),
  });
}

export function executeDemoStep(state: DemoMatchState, stepId: string): DemoMatchState {
  assertActive(state);
  const step = pendingStep(state, stepId);
  const remaining = step.actions.filter((action) => !(state.completedActionIds ?? []).includes(action.id));
  return executePlanActions(state, step, remaining);
}

/** Executes one selected plan action; its group stays pending until all actions are completed. */
export function executeDemoAction(state: DemoMatchState, stepId: string, actionId: string): DemoMatchState {
  assertActive(state);
  const step = pendingStep(state, stepId);
  const action = step.actions.find((candidate) => candidate.id === actionId);
  if (!action) throw new Error("Deze wisselregel hoort niet bij dit wisselmoment.");
  if ((state.completedActionIds ?? []).includes(actionId)) throw new Error("Deze wisselregel is al uitgevoerd.");
  return executePlanActions(state, step, [action]);
}

export function skipDemoStep(state: DemoMatchState, stepId: string): DemoMatchState {
  assertActive(state);
  const step = pendingStep(state, stepId);
  const remaining = step.actions.filter((action) => !(state.completedActionIds ?? []).includes(action.id));
  return freeze({
    ...state,
    stepStatus: { ...state.stepStatus, [stepId]: "skipped" },
    events: recordEvent(state, { type: "skipped", stepId, plannedMinute: step.matchMinute, actions: remaining }),
  });
}

export function substituteDemoPlayer(state: DemoMatchState, playerOutKey: string, playerInKey: string): DemoMatchState {
  assertActive(state);
  const action: DemoAction = {
    id: `manual-${state.events.length + 1}`, kind: "substitution", playerOutKey, playerInKey,
    ...(playerOutKey === state.keeperKey ? { keeperKey: playerInKey } : {}),
  };
  const nextField = applyActions(state, [action]);
  return freeze({
    ...state, ...nextField,
    events: recordEvent(state, { type: "manual", actions: [action] }, { ...state, ...nextField }),
  });
}

/** Exchanges two occupied field slots; the UI must disclose a resulting keeper change. */
export function swapDemoPlayerPositions(state: DemoMatchState, playerAKey: string, playerBKey: string): DemoMatchState {
  assertActive(state);
  const keeperKey = playerAKey === state.keeperKey ? playerBKey
    : playerBKey === state.keeperKey ? playerAKey : undefined;
  const action: DemoAction = {
    id: `manual-${state.events.length + 1}`, kind: "positionSwap",
    playerOutKey: playerAKey, playerInKey: playerBKey,
    ...(keeperKey === undefined ? {} : { keeperKey }),
  };
  const nextField = applyActions(state, [action]);
  return freeze({
    ...state, ...nextField,
    events: recordEvent(state, { type: "manual", actions: [action] }, { ...state, ...nextField }),
  });
}

/** Changes slot layout and labels only; the current player occupying each slot stays there. */
export function changeDemoFormation(state: DemoMatchState, formation: DemoFormationState): DemoMatchState {
  assertActive(state);
  const fieldSlots = new Set(state.field.map((entry) => entry.slotId));
  const newSlots = new Set(formation.slots.map((slot) => slot.id));
  if (formation.slots.length !== state.field.length || newSlots.size !== fieldSlots.size ||
      formation.slots.some((slot) => !Number.isInteger(slot.id) || !fieldSlots.has(slot.id))) {
    throw new Error("De formatie moet iedere huidige veldpositie precies eenmaal bevatten.");
  }
  if (formation.slots.some((slot) => !slot.position.trim() ||
      (slot.x !== undefined && !Number.isFinite(slot.x)) ||
      (slot.y !== undefined && !Number.isFinite(slot.y)))) {
    throw new Error("Geef iedere positie een naam en gebruik geldige coördinaten.");
  }
  const keepers = formation.slots.filter((slot) => slot.position === "GK");
  const keeperSlot = state.field.find((entry) => entry.playerKey === state.keeperKey)?.slotId;
  if (keepers.length !== 1 || keepers[0].id !== keeperSlot) {
    throw new Error("De huidige keeper moet op de keeperpositie blijven. Wissel de keeper apart.");
  }
  const nextFormation = structuredClone(formation);
  return freeze({
    ...state, formation: nextFormation,
    events: recordEvent(state, { type: "formation", formation: nextFormation, actions: [] }, { ...state, formation: nextFormation }),
  });
}

export function getDemoComparison(state: DemoMatchState): DemoPlayerComparison[] {
  const plannedSecondsSoFar: Record<string, number> = Object.fromEntries(
    state.plan.players.filter((player) => !player.absent).map((player) => [player.key, 0]),
  );
  for (let index = 0; index < state.plannedSnapshots.length; index++) {
    const snapshot = state.plannedSnapshots[index];
    const nextSecond = (state.plannedSnapshots[index + 1]?.matchMinute ?? state.plan.match.regulationDurationMinutes) * 60;
    const duration = Math.max(0, Math.min(state.elapsedSeconds, nextSecond) - snapshot.matchMinute * 60);
    for (const entry of snapshot.field) plannedSecondsSoFar[entry.playerKey] += duration;
  }
  return state.plan.players.filter((player) => !player.absent).map((player) => {
    const slotId = state.field.find((entry) => entry.playerKey === player.key)?.slotId ?? null;
    const actualSeconds = state.secondsPlayed[player.key];
    const plannedSeconds = state.plannedSeconds[player.key];
    const number = player.number != null && Number.isSafeInteger(player.number) && player.number >= 0 ? player.number : null;
    return {
      playerKey: player.key, name: player.name, number, slotId, onField: slotId !== null,
      plannedMinutes: plannedSeconds / 60,
      plannedMinutesSoFar: plannedSecondsSoFar[player.key] / 60,
      actualMinutes: actualSeconds / 60,
      actualBenchMinutes: (state.elapsedSeconds - actualSeconds) / 60,
      deltaMinutes: (actualSeconds - plannedSecondsSoFar[player.key]) / 60,
      finalDeltaMinutes: (actualSeconds - plannedSeconds) / 60,
    };
  });
}
