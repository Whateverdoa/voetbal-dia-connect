/**
 * Position codes and labels for players (field view + substitution suggestions).
 * Codes: K (keeper), V (verdediger), M (midden), A (aanval).
 */

export const POSITION_CODES = ["K", "V", "M", "A"] as const;
export type PositionCode = (typeof POSITION_CODES)[number];

export const POSITION_LABELS: Record<PositionCode, string> = {
  K: "Keeper",
  V: "Verdediger",
  M: "Midden",
  A: "Aanval",
};

/** Role group for position-aware substitution suggestions (same group = preferred swap). */
export const POSITION_GROUP: Record<PositionCode, "keeper" | "back" | "mid" | "forward"> = {
  K: "keeper",
  V: "back",
  M: "mid",
  A: "forward",
};

export function getPositionLabel(code: string): string {
  return POSITION_LABELS[code as PositionCode] ?? code;
}

export function isPositionMatch(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b) return false;
  return a === b || POSITION_GROUP[a as PositionCode] === POSITION_GROUP[b as PositionCode];
}
