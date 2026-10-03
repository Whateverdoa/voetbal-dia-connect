/**
 * Phone vs PC surface. PC includes laptop, desktop, and iPad.
 * Uses the short viewport side so landscape phones stay mobile.
 */
export type DeviceSurface = "mobile" | "pc";

/** iPad mini short side is ~744; phones stay well below 500. */
export const PC_MIN_SHORT_SIDE = 600;

export function isPcViewport(width: number, height: number): boolean {
  if (!Number.isFinite(width) || !Number.isFinite(height)) return false;
  if (width <= 0 || height <= 0) return false;
  return Math.min(width, height) >= PC_MIN_SHORT_SIDE;
}

export function surfaceFromViewport(
  width: number,
  height: number
): DeviceSurface {
  return isPcViewport(width, height) ? "pc" : "mobile";
}
