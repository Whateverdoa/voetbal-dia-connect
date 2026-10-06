export const OBSERVATION_CRITERIA = [
  { id: "ball_control", group: "Techniek", label: "Aanname en balcontrole", hint: "Eerste aanname, balbescherming en handelen onder druk." },
  { id: "passing", group: "Techniek", label: "Passing en uitvoering", hint: "Richting, snelheid en timing van de pass; beide voeten." },
  { id: "scanning", group: "Tactiek", label: "Kijken en beslissen", hint: "Vooraf scannen, opties herkennen en keuzes aan de bal." },
  { id: "positioning", group: "Tactiek", label: "Positiespel en vrijlopen", hint: "Afstanden, aanspeelbaarheid en ruimte voor een teamgenoot." },
  { id: "transition", group: "Tactiek", label: "Omschakelen", hint: "Reactie na balwinst en balverlies; terugkomen in de organisatie." },
  { id: "movement", group: "Bewegen", label: "Coördinatie en herhaalde inzet", hint: "Bewegingscontrole en blijven meedoen in de geobserveerde situatie." },
  { id: "learning", group: "Gedrag", label: "Leerbaarheid en reactie", hint: "Omgaan met aanwijzingen, proberen en reageren na een fout." },
  { id: "teamwork", group: "Gedrag", label: "Communicatie en samenwerking", hint: "Coachen, luisteren en afstemmen met teamgenoten." },
  { id: "role_execution", group: "Positierol", label: "Uitvoering van de rol", hint: "Bijvoorbeeld keeper: uitgangspositie, reddingen en hervattingen; veldspeler: afgesproken rol." },
] as const;
export type ObservationCriterion = (typeof OBSERVATION_CRITERIA)[number]["id"];
export const OBSERVATION_LEVELS = ["Niet geobserveerd", "In ontwikkeling", "Passend bij de rol", "Sterk in deze context"] as const;
export const OBSERVATION_CONFIDENCE = ["Eerste indruk", "Meerdere momenten", "Herhaald waargenomen"] as const;
export interface ObservationContent {
  context: "match" | "training";
  matchId?: string;
  observedOn: string;
  position: string;
  minutes: number;
  confidence: (typeof OBSERVATION_CONFIDENCE)[number];
  criteria: Record<ObservationCriterion, { level: (typeof OBSERVATION_LEVELS)[number]; evidence: string }>;
  strengths: string;
  development: string;
  followUp: string;
}
export interface StaffObservation {
  id: string;
  playerId: string;
  authorRole: "coach" | "scout";
  status: "draft" | "final";
  content: ObservationContent;
  createdAt: number;
  updatedAt: number;
}
export type ObservationCommand =
  | { type: "setObservationsEnabled"; enabled: boolean }
  | { type: "saveObservation"; observationId?: string; playerId: string; content: ObservationContent }
  | { type: "finalizeObservation"; observationId: string };

export function emptyObservation(observedOn: string, matchId?: string): ObservationContent {
  return {
    context: matchId ? "match" : "training", ...(matchId ? { matchId } : {}), observedOn,
    position: "", minutes: 30, confidence: "Eerste indruk",
    criteria: Object.fromEntries(OBSERVATION_CRITERIA.map(({ id }) => [id, { level: "Niet geobserveerd", evidence: "" }])) as ObservationContent["criteria"],
    strengths: "", development: "", followUp: "",
  };
}
