import { buildEventGameTimeStamp } from "./matchEventGameTime";
import { workspacePlan, workspaceRevision, type WorkspaceSource } from "./coachAssistantWorkspace";
import { replanFromCurrent } from "../../src/lib/coachAssistant/replanFromCurrent";
import { canonicalPosition } from "../../src/lib/coachAssistant/history";
import type { DemoMatchState } from "../../src/lib/substitutions/demoMatch";

/** Clock anchors join the revision so a quarter change invalidates a preview. */
export function liveRevision(source: WorkspaceSource): string {
  const m = source.match;
  return JSON.stringify([workspaceRevision(source), m.currentQuarter, m.quarterStartedAt,
    m.pausedAt, m.frozenClockMs, m.bankedOverrunSeconds, m.leadCoachId]);
}

export function liveProposal(source: WorkspaceSource, intervalMinutes: number, calculatedAt: number) {
  const { match } = source;
  if (match.cancelledAt || !["live", "halftime"].includes(match.status)) {
    throw new Error("Bereken vanaf nu is beschikbaar tijdens de wedstrijd en in de rust.");
  }
  const { plan } = workspacePlan(source);
  // Break time is not playing time. At a break, plan from the next period boundary.
  const elapsedSeconds = match.status === "halftime"
    ? Math.max(0, match.currentQuarter - 1) * plan.match.regulationDurationMinutes * 60 / match.quarterCount
    : buildEventGameTimeStamp(match, calculatedAt).gameSecond;
  if (elapsedSeconds >= plan.match.regulationDurationMinutes * 60) {
    throw new Error("De reguliere speeltijd is voorbij. Pas eventuele wissels handmatig aan.");
  }
  if (source.players.some(({ entry }) => entry.onField && (entry.absent || entry.injured || entry.fieldSlotIndex === undefined))) {
    throw new Error("Werk eerst de actuele veldopstelling bij, inclusief de vervanger van een geblesseerde speler.");
  }
  // Old pending actions must not constrain a fresh plan from the actual field.
  plan.steps = [];
  const state: DemoMatchState = {
    plan, elapsedSeconds, phase: "paused", halftimeTaken: match.currentQuarter > 1 || match.status === "halftime",
    field: plan.startingLineup.field, bench: plan.startingLineup.bench, keeperKey: plan.startingLineup.keeperKey,
    formation: plan.formation, stepStatus: {}, completedActionIds: [], events: [], plannedSnapshots: [], plannedSeconds: {},
    secondsPlayed: Object.fromEntries(source.players.map(({ entry }) => [String(entry.playerId),
      (entry.minutesPlayed ?? 0) * 60 + (match.status === "live" && entry.onField && entry.lastSubbedInAt != null
        ? Math.max(0, calculatedAt - entry.lastSubbedInAt) / 1000 : 0)])),
  };
  const result = replanFromCurrent(state, {
    players: source.players.map(({ entry, player }) => ({ key: String(entry.playerId),
      availability: entry.injured ? "injured" : entry.absent ? "absent" : "present",
      primaryPosition: canonicalPosition(player.positionPrimary ?? null), secondaryPosition: canonicalPosition(player.positionSecondary ?? null) })),
    history: [], teamKey: String(match.teamId), targetDate: new Date(match.scheduledAt ?? calculatedAt).toISOString().slice(0, 10), intervalMinutes,
  });
  return { revision: liveRevision(source), calculatedAt, fromSecond: elapsedSeconds,
    plan: result.plan, totals: result.totals, steps: result.steps };
}

export function validateLivePreview(source: WorkspaceSource, expectedRevision: string, calculatedAt: number, now: number) {
  if (liveRevision(source) !== expectedRevision) throw new Error("De wedstrijd of het plan is gewijzigd. Bereken het vervolg opnieuw.");
  if (!Number.isFinite(calculatedAt) || calculatedAt > now || now - calculatedAt > 120_000) {
    throw new Error("Dit voorstel is ouder dan twee minuten. Bereken opnieuw vanaf de actuele wedstrijdtijd.");
  }
}
