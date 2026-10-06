import { OBSERVATION_CONFIDENCE, OBSERVATION_CRITERIA, OBSERVATION_LEVELS, type ObservationCommand, type ObservationContent, type StaffObservation } from "./observationTypes";
import type { DemoActor, DemoState } from "./types";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const isText = (value: unknown, max: number): value is string => typeof value === "string" && value.length <= max;
function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function isObservationContent(value: unknown): value is ObservationContent {
  if (!isRecord(value) || (value.context !== "match" && value.context !== "training") || !isDate(value.observedOn)) return false;
  if (value.context === "match" ? !isText(value.matchId, 100) || !value.matchId : value.matchId !== undefined) return false;
  if (!isText(value.position, 80) || typeof value.minutes !== "number" || !Number.isInteger(value.minutes) || value.minutes < 5 || value.minutes > 120) return false;
  if (!OBSERVATION_CONFIDENCE.some((item) => item === value.confidence) || !isRecord(value.criteria)) return false;
  const criteria = value.criteria;
  if (!OBSERVATION_CRITERIA.every(({ id }) => {
    const item = criteria[id];
    return isRecord(item) && OBSERVATION_LEVELS.some((level) => level === item.level) && isText(item.evidence, 600);
  })) return false;
  return isText(value.strengths, 1200) && isText(value.development, 1200) && isText(value.followUp, 1200);
}

function hasCompleteEvidence(content: ObservationContent): boolean {
  const assessed = OBSERVATION_CRITERIA.filter(({ id }) => content.criteria[id].level !== "Niet geobserveerd");
  return Boolean(content.position.trim() && content.strengths.trim() && content.development.trim() && content.followUp.trim()
    && assessed.length > 0 && assessed.every(({ id }) => content.criteria[id].evidence.trim()));
}

export function isStaffObservation(value: unknown): value is StaffObservation {
  if (!isRecord(value) || !isText(value.id, 100) || !/^[\w-]+$/.test(value.id) || !isText(value.playerId, 100) || !value.playerId) return false;
  if (value.authorRole !== "coach" && value.authorRole !== "scout") return false;
  if (value.status !== "draft" && value.status !== "final") return false;
  if (!isObservationContent(value.content)) return false;
  if (value.status === "final" && !hasCompleteEvidence(value.content)) return false;
  return typeof value.createdAt === "number" && Number.isFinite(value.createdAt) && typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt);
}

/** Staff reports have no connection to family feedback, badges or elections. */
export function getStaffObservations(state: DemoState, actor: DemoActor, playerId?: string): StaffObservation[] {
  if (!state.observationsEnabled || (actor.role !== "coach" && actor.role !== "scout")) return [];
  return (state.observations ?? []).filter((item) => (!playerId || item.playerId === playerId)
    && (item.status === "final" || item.authorRole === actor.role)).sort((a, b) => b.updatedAt - a.updatedAt);
}

function assertAllowed(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

export function applyObservationCommand(state: DemoState, actor: DemoActor, command: ObservationCommand, now: number): DemoState {
  if (command.type === "setObservationsEnabled") {
    assertAllowed(actor.role === "coach", "Alleen de coach kan de observatieruimte aan- of uitzetten.");
    assertAllowed(typeof command.enabled === "boolean", "Kies of de observatieruimte aan of uit staat.");
    return { ...state, observationsEnabled: command.enabled };
  }
  assertAllowed(actor.role === "coach" || actor.role === "scout", "Deze observatieruimte is alleen voor coaches en scouts.");
  assertAllowed(state.observationsEnabled, "De coach heeft de observatieruimte nog niet aangezet.");
  const observations = state.observations ?? [];
  const previous = observations.find((item) => item.id === command.observationId);
  if (previous) {
    assertAllowed(previous.authorRole === actor.role, "Je kunt alleen je eigen concepten bewerken.");
    assertAllowed(previous.status === "draft", "Dit verslag is vastgelegd. Maak een nieuwe observatie voor een volgend moment.");
  }
  if (command.type === "finalizeObservation") {
    assertAllowed(previous, "Bewaar eerst je observatie als concept.");
    assertAllowed(hasCompleteEvidence(previous.content), "Vul de positie, sterke punten, ontwikkelpunten en vervolgstap in. Onderbouw minstens één geobserveerd onderdeel en elke ingevulde beoordeling met een concreet moment.");
    return { ...state, observations: observations.map((item) => item.id === previous.id ? { ...item, status: "final", updatedAt: now } : item) };
  }
  assertAllowed(state.players.some((player) => player.id === command.playerId), "Speler niet gevonden.");
  assertAllowed(!previous || previous.playerId === command.playerId, "Een bestaande observatie hoort bij dezelfde speler te blijven.");
  assertAllowed(isObservationContent(command.content), "Controleer de observatiedatum, duur (5–120 minuten), wedstrijd en ingevulde teksten.");
  assertAllowed(command.content.context !== "match" || state.matches.some((match) => match.id === command.content.matchId && match.participantIds.includes(command.playerId)), "Kies een wedstrijd waaraan deze speler deelnam.");
  const id = previous?.id ?? command.observationId ?? `observation-${now}-${observations.length}`;
  assertAllowed(id.length <= 100 && /^[\w-]+$/.test(id), "Ongeldige observatie. Open een nieuw formulier.");
  const content = structuredClone(command.content);
  content.position = content.position.trim();
  content.strengths = content.strengths.trim();
  content.development = content.development.trim();
  content.followUp = content.followUp.trim();
  for (const { id: criterion } of OBSERVATION_CRITERIA) content.criteria[criterion].evidence = content.criteria[criterion].evidence.trim();
  const observation: StaffObservation = { id, playerId: command.playerId, authorRole: actor.role, status: "draft", content, createdAt: previous?.createdAt ?? now, updatedAt: now };
  return { ...state, observations: [...observations.filter((item) => item.id !== id), observation] };
}
