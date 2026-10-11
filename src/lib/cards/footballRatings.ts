/** Shared by the design collection, real player cards and server-side card rules. */
export const FOOTBALL_SHIELD_STATS = [
  { key: "pace", attribute: "snl", label: "SNL", name: "Snelheid" },
  { key: "shooting", attribute: "sch", label: "SCH", name: "Schieten" },
  { key: "passing", attribute: "pas", label: "PAS", name: "Passen" },
  { key: "dribbling", attribute: "dri", label: "DRI", name: "Dribbelen" },
  { key: "defending", attribute: "vrd", label: "VRD", name: "Verdedigen" },
  { key: "physical", attribute: "fys", label: "FYS", name: "Fysiek" },
] as const;

export type FootballShieldStats = Partial<Record<(typeof FOOTBALL_SHIELD_STATS)[number]["key"], number>>;
type CardAssessment = Partial<Record<(typeof FOOTBALL_SHIELD_STATS)[number]["attribute"], number>>;

/** Translate field names only; never infer football ratings from XP or 1–5 reviews. */
export function toFootballShieldStats(ratings?: CardAssessment | null): FootballShieldStats {
  return Object.fromEntries(FOOTBALL_SHIELD_STATS.flatMap(({ key, attribute }) => {
    const value = ratings?.[attribute];
    return value === undefined ? [] : [[key, value]];
  }));
}

/** Design examples allow zero; persisted coach ratings separately require 1–99. */
export function averageFootballShieldRating(stats?: FootballShieldStats): number | null {
  const values = FOOTBALL_SHIELD_STATS.map(({ key }) => stats?.[key]);
  if (values.some((value) => value === undefined || !Number.isFinite(value) || value < 0 || value > 99)) return null;
  return Math.round(values.reduce<number>((sum, value) => sum + (value ?? 0), 0) / FOOTBALL_SHIELD_STATS.length);
}
