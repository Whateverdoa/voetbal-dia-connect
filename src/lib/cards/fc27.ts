/** Shared, serializable card rules. Coach assessments never include award bonuses. */
export const FC_ATTRIBUTES = [
  { key: "snl", label: "SNL", name: "Snelheid", help: "Versnelling en sprint, met en zonder bal.", icon: "quick_start" },
  { key: "sch", label: "SCH", name: "Schieten", help: "Afwerken, plaatsing en schotkracht.", icon: "placed_ball" },
  { key: "pas", label: "PAS", name: "Passen", help: "Nauwkeurigheid, overzicht en passende keuzes.", icon: "through_pass" },
  { key: "dri", label: "DRI", name: "Dribbelen", help: "Balcontrole, wenden en dribbelen.", icon: "dribbler" },
  { key: "vrd", label: "VRD", name: "Verdedigen", help: "Positionering, onderscheppen en duels.", icon: "interceptor" },
  { key: "fys", label: "FYS", name: "Fysiek", help: "Kracht, balans en uithoudingsvermogen.", icon: "tireless" },
] as const;

export type FcAttribute = (typeof FC_ATTRIBUTES)[number]["key"];
export type FcRatings = Record<FcAttribute, number>;
export type FcAssessment = Partial<FcRatings>;
export type CardKind = "week" | "month";

export const PLAY_STYLES = [
  { id: "placed_ball", category: "Afmaken", name: "Geplaatste bal", description: "Plaatst de bal gericht met gevoel en effect." },
  { id: "power_shot", category: "Afmaken", name: "Krachtig schot", description: "Schiet krachtig met een goede traptechniek." },
  { id: "through_pass", category: "Passen", name: "Dieptepass", description: "Ziet de ruimte en speelt een medespeler vrij in de diepte." },
  { id: "accurate_cross", category: "Passen", name: "Nauwkeurige voorzet", description: "Brengt de bal vanaf de zijkant gericht bij een medespeler." },
  { id: "interceptor", category: "Verdedigen", name: "Onderschepper", description: "Leest het spel en onderschept passes." },
  { id: "strong_tackle", category: "Verdedigen", name: "Sterke tackle", description: "Wint de bal met goed getimede, beheerste tackles." },
  { id: "ball_control", category: "Balbeheersing", name: "Balcontrole", description: "Neemt de bal verzorgd aan en houdt controle onder druk." },
  { id: "dribbler", category: "Balbeheersing", name: "Dribbelaar", description: "Passeert tegenstanders met behendige bewegingen aan de bal." },
  { id: "quick_start", category: "Fysiek", name: "Snelle starter", description: "Versnelt snel en reageert alert op nieuwe spelsituaties." },
  { id: "tireless", category: "Fysiek", name: "Onvermoeibaar", description: "Blijft actief meedoen en herhaalt loopacties." },
  { id: "reflex_keeper", category: "Keepen", name: "Reflexkeeper", description: "Reageert snel op schoten van dichtbij." },
  { id: "high_ball", category: "Keepen", name: "Hoge bal", description: "Beoordeelt hoge ballen goed en grijpt overtuigend in." },
] as const;

export type PlayStyleId = (typeof PLAY_STYLES)[number]["id"];
export interface CardRecognition {
  roundId: string;
  kind: CardKind;
  periodKey: string;
  publishedAt: number;
  expiresAt: number;
}
export interface FcCardData {
  fcRatings?: FcAssessment | null;
  playStyleIds?: string[];
  recognitions?: CardRecognition[];
}

/** Public card statistics deliberately omit coach-only playing minutes. */
export interface CardProfile {
  xp: number;
  level: number;
  rarity: "common" | "rare" | "epic";
  seasonStats: { matches: number; minutes?: number; goals: number; assists: number; cleanSheets: number };
  badges?: string[];
}

export function isFcAssessment(value: unknown): value is FcAssessment {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return Object.entries(value).every(([key, score]) => FC_ATTRIBUTES.some((attribute) => attribute.key === key)
    && typeof score === "number" && Number.isInteger(score) && score >= 1 && score <= 99);
}

export function isFcRatings(value: unknown): value is FcRatings {
  if (!isFcAssessment(value)) return false;
  return FC_ATTRIBUTES.every(({ key }) => {
    const score = (value as Record<string, unknown>)[key];
    return typeof score === "number" && Number.isInteger(score) && score >= 1 && score <= 99;
  });
}

export function ratingOverall(ratings: FcAssessment | null | undefined): number | null {
  if (!isFcRatings(ratings)) return null;
  return Math.round(FC_ATTRIBUTES.reduce((sum, { key }) => sum + ratings[key], 0) / 6);
}

export function activeRecognitions(recognitions: readonly CardRecognition[] = [], now = Date.now()): CardRecognition[] {
  return recognitions.filter((award) => award.publishedAt <= now && now < award.expiresAt);
}

export function withCardBonus(ratings: FcAssessment | null | undefined, recognitions: readonly CardRecognition[] = [], now = Date.now()): { ratings: FcAssessment | null; overall: number | null; bonus: number; kind: CardKind | null } {
  const active = activeRecognitions(recognitions, now);
  const kind = active.some((award) => award.kind === "month") ? "month" : active.some((award) => award.kind === "week") ? "week" : null;
  const bonus = kind === "month" ? 5 : kind === "week" ? 2 : 0;
  if (!isFcAssessment(ratings)) return { ratings: null, overall: null, bonus, kind };
  const boosted = Object.fromEntries(FC_ATTRIBUTES.flatMap(({ key }) => ratings[key] === undefined ? [] : [[key, Math.min(99, ratings[key] + bonus)]])) as FcAssessment;
  return { ratings: boosted, overall: ratingOverall(boosted), bonus, kind };
}

export function ratingSpread(players: readonly { active?: boolean; fcRatings?: FcAssessment | null }[]): { min: number; max: number; difference: number; warning: boolean } | null {
  const scores = players.filter((player) => player.active !== false).map((player) => ratingOverall(player.fcRatings)).filter((score): score is number => score !== null);
  if (scores.length < 2) return null;
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  return { min, max, difference: max - min, warning: max - min > 10 };
}

export function validPlayStyleIds(ids: readonly string[]): boolean {
  const known = new Set<string>(PLAY_STYLES.map((style) => style.id));
  return ids.length <= 3 && new Set(ids).size === ids.length && ids.every((id) => known.has(id));
}
