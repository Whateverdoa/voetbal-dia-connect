/**
 * Pitch orientation for the presentation views.
 *
 * Formations are authored portrait: the keeper sits at a high `y` and the
 * attackers at a low `y`. A TV is landscape, so a quarter turn wins back the
 * side margins that a portrait pitch wastes.
 */

export type PitchOrientation = "portrait" | "landscape";

/**
 * Maps portrait percentage coordinates onto the landscape pitch. The own goal
 * ends up on the left, so the team attacks left to right as on broadcast TV.
 */
export function orientSlots<T extends { x: number; y: number }>(
  slots: readonly T[],
  orientation: PitchOrientation,
): T[] {
  if (orientation === "portrait") return [...slots];
  return slots.map((slot) => ({ ...slot, x: 100 - slot.y, y: slot.x }));
}

/** Frame aspect for an orientation; landscape swaps the pitch's own axes. */
export function orientAspect(
  aspectW: number,
  aspectH: number,
  orientation: PitchOrientation,
): { aspectW: number; aspectH: number } {
  return orientation === "landscape"
    ? { aspectW: aspectH, aspectH: aspectW }
    : { aspectW, aspectH };
}
