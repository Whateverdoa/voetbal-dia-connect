import definitions from "./playStyles.json";

export type PlayStyleId = keyof typeof definitions;
export const MAX_PLAY_STYLES = 3;
export const PLAY_STYLE_CATEGORIES = [
  { id: "finishing", name: "Afmaken" },
  { id: "passing", name: "Passen" },
  { id: "defending", name: "Verdedigen" },
  { id: "control", name: "Balbeheersing" },
  { id: "physical", name: "Fysiek" },
  { id: "goalkeeping", name: "Keepen" },
] as const;

export const PLAY_STYLES = (Object.keys(definitions) as PlayStyleId[]).map(
  (id) => ({
    id,
    name: definitions[id].name,
    category: definitions[id].category,
    description: definitions[id].description,
  }),
);

export function getPlayStyle(id: PlayStyleId) {
  return PLAY_STYLES.find((style) => style.id === id)!;
}

export const ICON_LANGUAGES = [
  {
    id: "line",
    name: "Lijn",
    description: "Open ruit, één eenvoudig symbool. Rustig en luchtig.",
  },
  {
    id: "bold",
    name: "Krachtig",
    description: "Lichte ruit, stevige tekens. Duidelijk op klein formaat.",
  },
  {
    id: "flat",
    name: "DIA vlak",
    description: "Groene vlakken, één kleur. Eenvoudig en herkenbaar.",
  },
] as const;
export type IconLanguage = (typeof ICON_LANGUAGES)[number]["id"];

export function playStyleAsset(
  id: PlayStyleId,
  variant: "neutral" | "dia" = "neutral",
  language: IconLanguage = "bold",
) {
  return `/cards/playstyles/${id}-${variant}${language === "bold" ? "" : `-${language}`}.svg?v=10`;
}

/** Presentation boundary only; persistence must validate the full input on the server. */
export function normalizePlayStyles(ids: readonly string[]): PlayStyleId[] {
  return [...new Set(ids)]
    .filter((id): id is PlayStyleId => Object.hasOwn(definitions, id))
    .slice(0, MAX_PLAY_STYLES);
}

export function togglePlayStyle(
  ids: readonly PlayStyleId[],
  id: PlayStyleId,
): PlayStyleId[] {
  const current = normalizePlayStyles(ids);
  if (current.includes(id)) return current.filter((value) => value !== id);
  return current.length < MAX_PLAY_STYLES ? [...current, id] : current;
}

/** Characteristics share the same icon family, without implying an assigned playstyle. */
export const CHARACTERISTIC_ICONS = [
  { label: "SNL", name: "Snelheid", icon: "quick-starter" },
  { label: "SCH", name: "Schieten", icon: "power-shot" },
  { label: "PAS", name: "Passen", icon: "through-pass" },
  { label: "DRI", name: "Dribbelen", icon: "dribbler" },
  { label: "VRD", name: "Verdedigen", icon: "interceptor" },
  { label: "FYS", name: "Fysiek", icon: "relentless" },
] as const satisfies readonly {
  label: string;
  name: string;
  icon: PlayStyleId;
}[];
