import type { FunctionReturnType } from "convex/server";
import type { api } from "../../../convex/_generated/api";
import { FORMATIONS } from "../formations";
import type { DemoPlan } from "../substitutions/demoPlan";

type CoachMatch = NonNullable<FunctionReturnType<typeof api.matches.getForCoach>>;
type Workspace = NonNullable<FunctionReturnType<typeof api.coachAssistant.workspace>>;

/** Read-only test adapter for the existing production coach query; no new backend is required. */
export function testWorkspace(match: CoachMatch): Workspace {
  const players = match.players.filter((player) => player !== null);
  const custom = match.customFormationTemplate;
  const formationId = custom ? `custom:${custom._id}` : match.formationId ?? "11v11_1-4-3-3";
  const formation = custom ?? FORMATIONS[formationId];
  if (!formation) throw new Error("De wedstrijdformatie is onbekend. Kies eerst een geldige formatie in de app.");
  const duration = match.regulationDurationMinutes ?? 60;
  const available = players.filter((player) => !player.absent && !player.injured);
  const field = available.filter((player) => player.onField && player.fieldSlotIndex !== undefined)
    .map((player) => ({ playerKey: String(player.playerId), slotId: player.fieldSlotIndex! }));
  const keepers = available.filter((player) => player.isKeeper);
  const keeperSlot = formation.slots.find((slot) => slot.position === "GK");
  const keeperKey = keepers.length === 1 ? String(keepers[0].playerId) : field.find((row) => row.slotId === keeperSlot?.id)?.playerKey ?? "";
  const steps = new Map<number, DemoPlan["steps"][number]>();
  const unresolved: string[] = [];
  for (const row of match.substitutionPlans) {
    if (row.status !== "pending") continue;
    const minute = row.targetMinute ?? (row.targetQuarter === undefined ? undefined : (row.targetQuarter - 1) * duration / match.quarterCount);
    if (minute === undefined) { unresolved.push("Er staat een wissel zonder tijd in de app. Bereken een nieuw voorstel voor deze test."); continue; }
    const step = steps.get(minute) ?? { id: `minute-${minute}`, matchMinute: minute, actions: [] };
    step.actions.push({ id: String(row._id), kind: row.kind, playerOutKey: String(row.playerOutId), playerInKey: String(row.playerInId) });
    steps.set(minute, step);
  }
  const plan: DemoPlan = {
    format: "dia-substitution-plan", version: 1,
    match: { regulationDurationMinutes: duration, fieldPlayerCountIncludingKeeper: formation.slots.length, halftimeAtMinute: duration / 2 },
    formation: { id: formationId, name: formation.name, slots: formation.slots },
    players: players.map((player) => ({ key: String(player.playerId), name: player.name, number: player.number ?? null,
      absent: player.absent || player.injured, ...(player.injured ? { unavailableReason: "injured" as const } : {}) })),
    startingLineup: { keeperKey, field, bench: available.filter((player) => !player.onField).map((player) => String(player.playerId)) },
    steps: [...steps.values()].sort((a, b) => a.matchMinute - b.matchMinute),
    review: { sourceConfirmed: false, unresolved: [...new Set(unresolved)] },
  };
  return {
    matchId: match._id, teamId: match.teamId, code: match.publicCode, teamName: match.teamName, opponent: match.opponent,
    scheduledAt: match.scheduledAt ?? null,
    canSave: ["scheduled", "lineup"].includes(match.status) && !match.startedAt && !match.cancelledAt,
    revision: JSON.stringify([match._id, match.status, match.scheduledAt, plan, players.map((player) => [player.positionPrimary, player.positionSecondary])]),
    plan, quarterCount: match.quarterCount,
    planTiming: match.substitutionPlans.filter((row) => row.status === "pending").map((row) => ({ id: String(row._id), quarter: row.targetQuarter, minute: row.targetMinute })),
    warnings: [...new Set([...unresolved, ...(keepers.length === 1 ? [] : ["Controleer wie deze wedstrijd keept."])])],
    preferences: players.map((player) => ({ key: String(player.playerId), availability: player.injured ? "injured" : player.absent ? "absent" : "present",
      primaryPosition: player.positionPrimary ?? null, secondaryPosition: player.positionSecondary ?? null })),
  };
}
