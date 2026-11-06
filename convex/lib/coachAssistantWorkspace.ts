import type { Doc } from "../_generated/dataModel";
import type { DemoPlan } from "../../src/lib/substitutions/demoPlan";
import { getFormation } from "../../src/lib/formations";
import { validatePortableSubstitutionPlan } from "../../src/lib/substitutions/validatePortableSubstitutionPlan";

export type WorkspacePlayer = { entry: Doc<"matchPlayers">; player: Doc<"players"> };
export type WorkspaceSource = {
  match: Doc<"matches">; players: WorkspacePlayer[]; rows: Doc<"substitutionPlans">[];
  custom: Doc<"formationTemplates"> | null;
};

/** Includes every editable source field; existing app editors need no revision migration. */
export function workspaceRevision(source: WorkspaceSource): string {
  const { match, players, rows, custom } = source;
  return JSON.stringify({
    match: [match._id, match.teamId, match.status, match.startedAt, match.cancelledAt, match.scheduledAt,
      match.quarterCount, match.regulationDurationMinutes, match.formationId, match.customFormationTemplateId],
    players: [...players].sort((a, b) => String(a.entry._id).localeCompare(String(b.entry._id))).map(({ entry: e, player: p }) =>
      [e._id, e.playerId, e.onField, e.isKeeper, e.absent, e.injured, e.fieldSlotIndex, e.minutesPlayed, e.lastSubbedInAt, "dismissed" in e && e.dismissed,
        p.name, p.number, p.positionPrimary, p.positionSecondary]),
    rows: [...rows].sort((a, b) => String(a._id).localeCompare(String(b._id))).map((r) =>
      [r._id, r.sequence, r.kind, r.targetMinute, r.targetQuarter, r.playerOutId, r.playerInId, r.status, r.note, r.updatedAt]),
    custom: custom ? [custom._id, custom.updatedAt, custom.slots] : null,
  });
}

export function sourceFormation(source: WorkspaceSource, requestedId?: string) {
  const customId = source.custom ? `custom:${source.custom._id}` : null;
  const id = requestedId ?? customId ?? source.match.formationId ?? "11v11_1-4-3-3";
  const formation = id === customId && source.custom ? source.custom : getFormation(id);
  if (!formation) throw new Error("Deze formatie is niet beschikbaar in de app. Kies een geldige formatie.");
  return { id, name: formation.name, slots: formation.slots.map((slot) => ({ ...slot })) };
}

export function workspacePlan(source: WorkspaceSource): { plan: DemoPlan; warnings: string[] } {
  const warnings: string[] = [];
  const formation = sourceFormation(source);
  const duration = source.match.regulationDurationMinutes ?? 60;
  const available = source.players.filter(({ entry }) => !entry.absent && !entry.injured && !("dismissed" in entry && entry.dismissed));
  const field = available.filter(({ entry }) => entry.onField && entry.fieldSlotIndex !== undefined)
    .map(({ entry }) => ({ playerKey: String(entry.playerId), slotId: entry.fieldSlotIndex! }));
  const keepers = available.filter(({ entry }) => entry.isKeeper);
  const keeperSlot = formation.slots.find((slot) => slot.position === "GK");
  const keeperKey = keepers.length === 1 ? String(keepers[0].entry.playerId)
    : field.find((row) => row.slotId === keeperSlot?.id)?.playerKey ?? "";
  if (keepers.length !== 1) warnings.push("Controleer de keeper: er is geen eenduidige keepermarkering in de wedstrijdselectie.");
  if (!source.match.formationId && !source.custom) warnings.push("Er is nog geen formatie opgeslagen. De getoonde 4-3-3 is een voorstel; kies en controleer de wedstrijdvorm.");
  const steps = new Map<number, DemoPlan["steps"][number]>();
  const unresolved: string[] = [];
  for (const row of [...source.rows].sort((a, b) => a.sequence - b.sequence || String(a._id).localeCompare(String(b._id)))) {
    if (row.status !== "pending") continue;
    const minute = row.targetMinute ?? (row.targetQuarter === undefined ? undefined : (row.targetQuarter - 1) * duration / source.match.quarterCount);
    if (minute === undefined) { unresolved.push("Er staat een wissel zonder tijd in de app. Kies eerst een minuut of bereken een nieuw voorstel."); continue; }
    const step = steps.get(minute) ?? { id: `minute-${minute}`, matchMinute: minute, actions: [] };
    step.actions.push({ id: String(row._id), kind: row.kind ?? "substitution", playerOutKey: String(row.playerOutId), playerInKey: String(row.playerInId) });
    steps.set(minute, step);
  }
  warnings.push(...new Set(unresolved));
  return { warnings, plan: {
    format: "dia-substitution-plan", version: 1,
    match: { regulationDurationMinutes: duration, fieldPlayerCountIncludingKeeper: formation.slots.length, halftimeAtMinute: duration / 2 },
    formation,
    players: source.players.map(({ entry, player }) => ({ key: String(entry.playerId), name: player.name,
      number: player.number ?? null, absent: Boolean(entry.absent || entry.injured || ("dismissed" in entry && entry.dismissed)), ...(entry.injured ? { unavailableReason: "injured" as const } : {}) })),
    startingLineup: { keeperKey, field, bench: available.filter(({ entry }) => !entry.onField).map(({ entry }) => String(entry.playerId)) },
    steps: [...steps.values()].sort((a, b) => a.matchMinute - b.matchMinute),
    review: { sourceConfirmed: false, unresolved: [...new Set(unresolved)] },
  } };
}

/** Rebuild display metadata from the database; payload keys are never trusted as membership. */
export function validateWorkspaceSave(source: WorkspaceSource, proposed: DemoPlan, expectedRevision: string, reviewed: boolean): DemoPlan {
  if ("refereePolicy" in source.match && source.match.refereePolicy) throw new Error("Deze wedstrijd gebruikt de afzonderlijke scheidsrechterklok. Gebruik het bestaande planscherm.");
  if (!reviewed) throw new Error("Beoordeel en bevestig eerst het volledige plan.");
  if (!["scheduled", "lineup"].includes(source.match.status) || source.match.startedAt || source.match.cancelledAt || source.rows.some((r) => r.status !== "pending")) {
    throw new Error("Een volledig beginplan kan alleen vóór de aftrap van een niet-afgelaste wedstrijd worden opgeslagen.");
  }
  if (workspaceRevision(source) !== expectedRevision) throw new Error("De wedstrijd is intussen gewijzigd. Laad de actuele selectie en het plan opnieuw.");
  if (proposed.players.length !== source.players.length || new Set(proposed.players.map((p) => p.key)).size !== proposed.players.length ||
      source.players.some(({ entry }) => !proposed.players.some((p) => p.key === String(entry.playerId)))) throw new Error("De spelers horen niet bij deze wedstrijdselectie.");
  const formation = sourceFormation(source, proposed.formation.id);
  const duration = source.match.regulationDurationMinutes ?? 60;
  if (proposed.match.regulationDurationMinutes !== duration || proposed.match.fieldPlayerCountIncludingKeeper !== formation.slots.length ||
      proposed.match.halftimeAtMinute !== duration / 2) throw new Error("Speelduur of wedstrijdvorm wijkt af van de gekozen wedstrijd.");
  if (proposed.steps.reduce((sum, step) => sum + step.actions.length, 0) > 300 || proposed.steps.some((s) => s.actions.some((a) => a.keeperKey))) {
    throw new Error("Het plan bevat te veel regels of een keeperwissel die nog niet wordt ondersteund.");
  }
  const canonical: DemoPlan = { ...proposed, formation, players: source.players.map(({ entry, player }) => {
    const chosen = proposed.players.find((p) => p.key === String(entry.playerId))!;
    return { key: String(entry.playerId), name: player.name, number: player.number ?? null, absent: Boolean(chosen.absent || chosen.unavailableReason === "injured"),
      ...(chosen.unavailableReason === "injured" ? { unavailableReason: "injured" as const } : {}) };
  }) };
  const report = validatePortableSubstitutionPlan(canonical);
  if (!report.readyToPublish) throw new Error(report.issues.find((issue) => issue.severity === "error")?.message ?? "Controleer en bevestig de opstelling en alle wissels.");
  const keeperSlot = formation.slots.find((slot) => slot.position === "GK")!;
  if (report.snapshots.some((snapshot) => snapshot.field.find((row) => row.slotId === keeperSlot.id)?.playerKey !== canonical.startingLineup.keeperKey)) {
    throw new Error("Keeperwissels binnen het plan worden nog niet ondersteund. Kies één keeper voor deze wedstrijd.");
  }
  return canonical;
}
