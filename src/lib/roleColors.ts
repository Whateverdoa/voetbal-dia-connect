/**
 * Role color mapping for field visualization.
 * Maps our K/V/M/A slot roles to EA FC-style color pairs.
 */

export interface RoleColor {
  bg: string;
  text: string;
}

export const ROLE_COLORS: Record<string, RoleColor> = {
  K: { bg: "#f59e0b", text: "#000" }, // Amber — keeper
  V: { bg: "#3b82f6", text: "#fff" }, // Blue — verdediger
  M: { bg: "#10b981", text: "#fff" }, // Green — middenvelder
  A: { bg: "#ef4444", text: "#fff" }, // Red — aanvaller
};

const DEFAULT_COLOR: RoleColor = { bg: "#475569", text: "#fff" }; // Slate

export function getRoleColor(role: string | undefined): RoleColor {
  return (role && ROLE_COLORS[role]) || DEFAULT_COLOR;
}

/** Dutch display labels for K/V/M/A roles. */
export const ROLE_LABELS: Record<string, string> = {
  K: "KEP",
  V: "VER",
  M: "MID",
  A: "AAN",
};

export function getRoleLabel(role: string | undefined): string {
  return (role && ROLE_LABELS[role]) || "---";
}
