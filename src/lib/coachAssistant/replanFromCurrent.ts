import { assignField } from "./assignment";
import { canonicalPosition, collectEvidence } from "./history";
import { buildTransition } from "./transitions";
import type { AssistantInput, AssistantPlayer } from "./types";
import type { DemoPlan } from "../substitutions/demoPlan";
import { getDemoSteps, pauseDemoClock, type DemoMatchState } from "../substitutions/demoMatch";
import { validatePortableSubstitutionPlan } from "../substitutions/validatePortableSubstitutionPlan";

export interface RemainingProposal {
  revision: string;
  fromSecond: number;
  plan: DemoPlan;
  steps: DemoPlan["steps"];
  totals: Array<{ key: string; played: number; expected: number }>;
}

/** Phase is excluded so pausing to review does not invalidate an otherwise identical state. */
export function replanStateRevision(state: DemoMatchState): string {
  return JSON.stringify([state.elapsedSeconds, state.field, state.bench, state.keeperKey, state.formation,
    state.secondsPlayed, state.events, state.stepStatus, state.completedActionIds, state.replanRevision]);
}

export function replanFromCurrent(state: DemoMatchState, settings: Pick<AssistantInput, "players" | "history" | "teamKey" | "targetDate" | "intervalMinutes">): RemainingProposal {
  if (state.phase === "ready" || state.phase === "finished") throw new Error("Bereken een nieuw vervolg tijdens de oefenwedstrijd.");
  const end = state.plan.match.regulationDurationMinutes;
  const now = state.elapsedSeconds / 60;
  const interval = settings.intervalMinutes;
  if (!Number.isFinite(interval) || interval < 1 || interval > 60) throw new Error("Kies een wisselinterval tussen 1 en 60 minuten.");
  const formation = state.formation ?? state.plan.formation;
  const plan: DemoPlan = {
    ...state.plan,
    match: { ...state.plan.match, regulationDurationMinutes: end - now, halftimeAtMinute: state.plan.match.halftimeAtMinute != null && state.plan.match.halftimeAtMinute > now ? state.plan.match.halftimeAtMinute - now : null },
    formation: { ...formation, slots: formation.slots.map((slot) => ({ ...slot, x: slot.x ?? 50, y: slot.y ?? 50 })) },
    players: state.plan.players.map((player) => ({ ...player, sourceBenchMinutes: undefined })),
    startingLineup: { field: state.field.map((entry) => ({ ...entry })), bench: [...state.bench], keeperKey: state.keeperKey },
    steps: [], review: { sourceConfirmed: false, unresolved: [] },
  };
  const eligible = new Set([...state.field.map((entry) => entry.playerKey), ...state.bench]);
  const players: AssistantPlayer[] = plan.players.filter((player) => eligible.has(player.key)).map((player) => {
    const preference = settings.players.find((row) => row.key === player.key);
    return { ...preference, key: player.key, availability: "present", primaryPosition: canonicalPosition(preference?.primaryPosition ?? null), secondaryPosition: canonicalPosition(preference?.secondaryPosition ?? null) };
  });
  // Preserve pending keeper agreements, including a replacement selected before halftime.
  const keeperChanges = getDemoSteps(state).filter((step) => state.stepStatus[step.id] === "pending").flatMap((step) => step.actions
    .filter((action) => action.keeperKey && action.keeperKey !== state.keeperKey && !state.completedActionIds.includes(action.id))
    .map((action) => ({ minute: step.matchMinute, key: action.keeperKey! })));
  if (keeperChanges.some((change) => change.minute <= now)) throw new Error("Voer eerst de openstaande keeperwissel uit en bereken daarna het vervolg.");
  const keepers = new Set([state.keeperKey, ...keeperChanges.map((change) => change.key)]);
  const outfield = players.filter((player) => !keepers.has(player.key));
  const evidence = collectEvidence({ ...settings, players, plan, keeperKey: state.keeperKey, includeSubstitutions: true });
  const facts = new Map(evidence.evidence.map((row) => [row.playerKey, row]));
  const fieldHistory = outfield.every((player) => (facts.get(player.key)?.eligibleFieldMinutes ?? 0) > 0);
  const recordedHistory = outfield.every((player) => (facts.get(player.key)?.recordedEligibleMinutes ?? 0) > 0);
  const played = new Map(players.map((player) => [player.key, (state.secondsPlayed[player.key] ?? 0) / 60]));
  const boundaries = new Set([end, ...keeperChanges.map((change) => change.minute)]);
  for (let minute = now + interval; minute < end; minute += interval) boundaries.add(minute);
  const moments = [...boundaries].sort((a, b) => a - b);
  let field = state.field.map((entry) => ({ ...entry }));
  let elapsed = now;
  const keeperSlot = formation.slots.find((slot) => canonicalPosition(slot.position) === "GK");
  if (!keeperSlot) throw new Error("De huidige formatie mist een keeperplek.");
  const fieldSlots = formation.slots.filter((slot) => slot.id !== keeperSlot.id);
  for (const [index, boundary] of moments.entries()) {
    for (const entry of field) {
      const total = (played.get(entry.playerKey) ?? 0) + boundary - elapsed;
      const limit = players.find((player) => player.key === entry.playerKey)?.maxMinutes;
      if (limit !== undefined && total > limit + 1e-6) throw new Error("Een huidige veldspeler bereikt zijn minutengrens vóór de volgende wissel. Wissel die speler eerst of kies een korter interval.");
      played.set(entry.playerKey, total);
    }
    elapsed = boundary;
    if (boundary >= end) break;
    const nextBlock = moments[index + 1] - boundary;
    const available = outfield.filter((player) => player.maxMinutes === undefined || (played.get(player.key) ?? 0) + nextBlock <= player.maxMinutes + 1e-6);
    const assignment = assignField({ players: available, slots: fieldSlots, evidence: facts, plannedMinutes: played, duration: end,
      useMinutes: fieldHistory || recordedHistory, minuteBasis: fieldHistory ? "field" : "recorded", useStarts: false, reference: field, kickoff: false });
    if (!assignment) throw new Error("Geen volledig vervolg mogelijk met deze minutenafspraken en vaste plekken.");
    const keeper = keeperChanges.filter((change) => change.minute <= boundary).at(-1)?.key ?? state.keeperKey;
    const next = [{ playerKey: keeper, slotId: keeperSlot.id }, ...assignment];
    const step = buildTransition(field, next, boundary - now);
    step.id = `replan-${(state.replanRevision ?? 0) + 1}-${index}`;
    step.actions.forEach((action, actionIndex) => {
      action.id = `${step.id}-${actionIndex}`;
      if (action.playerInKey === keeper && keepers.has(keeper)) action.keeperKey = keeper;
    });
    if (step.actions.length) plan.steps.push(step);
    field = next;
  }
  const report = validatePortableSubstitutionPlan(plan);
  if (!report.structurallyValid || !report.simulationComplete) throw new Error(report.issues.find((issue) => issue.severity === "error")?.message ?? "Controleer de actuele veldbezetting.");
  return { revision: replanStateRevision(state), fromSecond: state.elapsedSeconds, plan,
    steps: plan.steps.map((step) => ({ ...step, matchMinute: step.matchMinute + now })),
    totals: players.map((player) => ({ key: player.key, played: (state.secondsPlayed[player.key] ?? 0) / 60, expected: played.get(player.key) ?? 0 })) };
}

export function applyRemainingProposal(state: DemoMatchState, proposal: RemainingProposal): DemoMatchState {
  if (state.phase === "ready" || state.phase === "finished" || proposal.revision !== replanStateRevision(state)) throw new Error("De veldsituatie of klok is veranderd. Bereken het vervolg opnieuw.");
  return { ...pauseDemoClock(state), futureSteps: structuredClone(proposal.steps), replanRevision: (state.replanRevision ?? 0) + 1,
    replannedAtSeconds: state.elapsedSeconds,
    stepStatus: { ...state.stepStatus, ...Object.fromEntries(proposal.steps.map((step) => [step.id, "pending" as const])) } };
}
