/**
 * Role color mapping for field visualization.
 * Colors are keyed by zone (keeper/defense/midfield/attack).
 * Input is an EN position code — zone is derived via positionToZone().
 */

import { positionToZone, type Zone } from "./positions";

export interface RoleColor {
  bg: string;
  text: string;
}

/** Zone → EA FC-style color pair. */
export const ZONE_COLORS: Record<Zone, RoleColor> = {
  keeper: { bg: "#f59e0b", text: "#000" },   // Amber
  defense: { bg: "#3b82f6", text: "#fff" },   // Blue
  midfield: { bg: "#10b981", text: "#fff" },  // Green
  attack: { bg: "#ef4444", text: "#fff" },    // Red
};

const DEFAULT_COLOR: RoleColor = { bg: "#475569", text: "#fff" }; // Slate

/** Get color for an EN position code (e.g. "CB" → defense → blue). */
export function getRoleColor(position: string | undefined): RoleColor {
  if (!position) return DEFAULT_COLOR;
  const zone = positionToZone(position);
  return ZONE_COLORS[zone] ?? DEFAULT_COLOR;
}

/** Get display label for a position (returns the EN abbreviation itself). */
export function getRoleLabel(position: string | undefined): string {
  return position ?? "---";
}
