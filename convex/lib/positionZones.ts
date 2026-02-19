/**
 * Position-to-zone mapping for Convex runtime.
 * Duplicated from src/lib/positions.ts (Convex can't import from src/).
 *
 * Used by: substitution matching in matchQueries.ts.
 */

export type Zone = "keeper" | "defense" | "midfield" | "attack";

/** EN position code → zone lookup. */
export const POSITION_TO_ZONE: Record<string, Zone> = {
  GK: "keeper",
  RB: "defense",
  CB: "defense",
  LB: "defense",
  RWB: "defense",
  LWB: "defense",
  CDM: "midfield",
  CM: "midfield",
  RM: "midfield",
  LM: "midfield",
  CAM: "midfield",
  RW: "attack",
  LW: "attack",
  CF: "attack",
  ST: "attack",
};

/** Derive zone from EN position code. Returns "defense" as fallback. */
export function positionToZone(code: string | undefined): Zone {
  if (!code) return "defense";
  return POSITION_TO_ZONE[code] ?? "defense";
}
