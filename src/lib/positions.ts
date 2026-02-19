/**
 * Position codes and zone mapping for players and formation slots.
 *
 * Single source of truth: 15 EN position abbreviations (FIFA/EA FC standard).
 * Zones (keeper/defense/midfield/attack) are derived at runtime — never stored.
 *
 * Used by: admin player creation, formation slots, field cards, substitution matching.
 */

export type Zone = "keeper" | "defense" | "midfield" | "attack";

export interface Position {
  code: string;
  name: string;
  nameDutch: string;
  zone: Zone;
}

/** All 15 positions in display order. */
export const POSITIONS: Position[] = [
  // Keeper
  { code: "GK", name: "Goalkeeper", nameDutch: "Keeper", zone: "keeper" },
  // Defense
  { code: "RB", name: "Right Back", nameDutch: "Rechter verdediger", zone: "defense" },
  { code: "CB", name: "Centre Back", nameDutch: "Centrale verdediger", zone: "defense" },
  { code: "LB", name: "Left Back", nameDutch: "Linker verdediger", zone: "defense" },
  { code: "RWB", name: "Right Wing Back", nameDutch: "Rechter vleugelverdediger", zone: "defense" },
  { code: "LWB", name: "Left Wing Back", nameDutch: "Linker vleugelverdediger", zone: "defense" },
  // Midfield
  { code: "CDM", name: "Central Defensive Midfielder", nameDutch: "Verdedigende middenvelder", zone: "midfield" },
  { code: "CM", name: "Central Midfielder", nameDutch: "Centrale middenvelder", zone: "midfield" },
  { code: "RM", name: "Right Midfielder", nameDutch: "Rechtshalf", zone: "midfield" },
  { code: "LM", name: "Left Midfielder", nameDutch: "Linkshalf", zone: "midfield" },
  { code: "CAM", name: "Central Attacking Midfielder", nameDutch: "Aanvallende middenvelder", zone: "midfield" },
  // Attack
  { code: "RW", name: "Right Winger", nameDutch: "Rechtsbuiten", zone: "attack" },
  { code: "LW", name: "Left Winger", nameDutch: "Linksbuiten", zone: "attack" },
  { code: "CF", name: "Centre Forward", nameDutch: "Hangende spits", zone: "attack" },
  { code: "ST", name: "Striker", nameDutch: "Spits", zone: "attack" },
];

/** All valid position codes for validation. */
export const POSITION_CODES: string[] = POSITIONS.map((p) => p.code);

/** Fast lookup: position code → zone. */
const POSITION_TO_ZONE: Record<string, Zone> = Object.fromEntries(
  POSITIONS.map((p) => [p.code, p.zone]),
) as Record<string, Zone>;

/** Derive zone from EN position code. Returns "defense" as fallback for unknown codes. */
export function positionToZone(code: string | undefined): Zone {
  if (!code) return "defense";
  return POSITION_TO_ZONE[code] ?? "defense";
}

/** Check if a string is a valid position code. */
export function isValidPosition(code: string): boolean {
  return code in POSITION_TO_ZONE;
}

/** Get position label (returns the EN abbreviation itself, e.g. "CB"). */
export function getPositionLabel(code: string): string {
  return isValidPosition(code) ? code : code;
}

/** Get Dutch name for a position code. */
export function getPositionNameDutch(code: string): string {
  const pos = POSITIONS.find((p) => p.code === code);
  return pos?.nameDutch ?? code;
}

/** Check if two players' positions match (same zone = compatible for substitution). */
export function isPositionMatch(
  a: string | undefined,
  b: string | undefined,
): boolean {
  if (!a || !b) return false;
  return positionToZone(a) === positionToZone(b);
}

/** Zone display names in Dutch (for optgroup labels). */
export const ZONE_LABELS_DUTCH: Record<Zone, string> = {
  keeper: "Doel",
  defense: "Verdediging",
  midfield: "Middenveld",
  attack: "Aanval",
};

/** Positions grouped by zone — for <optgroup> dropdowns. */
export const POSITION_OPTIONS: Array<{ zone: Zone; label: string; positions: Position[] }> = [
  { zone: "keeper", label: "Doel", positions: POSITIONS.filter((p) => p.zone === "keeper") },
  { zone: "defense", label: "Verdediging", positions: POSITIONS.filter((p) => p.zone === "defense") },
  { zone: "midfield", label: "Middenveld", positions: POSITIONS.filter((p) => p.zone === "midfield") },
  { zone: "attack", label: "Aanval", positions: POSITIONS.filter((p) => p.zone === "attack") },
];
