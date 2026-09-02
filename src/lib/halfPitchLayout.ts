/**
 * Half-pitch perspective layout for the TV presentation view (FC26 style).
 *
 * Formations span the full pitch (keeper near y=93, strikers near y=20). On a
 * half-pitch those attackers would fall off the top, so we compress the
 * occupied y-range into the half while keeping relative spacing.
 *
 * TILT_DEG / PERSPECTIVE_RATIO / HALF_PITCH_WIDEN / CARD_LIFT_PX / CARD_SCALE
 * are eye-tuned together: they decide how strong the trapezoid looks, how far
 * cards stand above the grass and how much room each card claims. They also
 * decide whether cards collide, so adjust them as a set and re-check the
 * densest formation (five across the middle, keeper under a central defender).
 */

export type PitchLayout = "full" | "halfPerspective";

/**
 * Degrees the grass plane pitches toward the camera. Steeper than this and the
 * far third of the plane collapses into a few pixels, leaving no grass behind
 * the attackers' cards.
 */
export const TILT_DEG = 38;

/**
 * Camera distance as a multiple of the pitch box height. Expressing it as a
 * ratio instead of a fixed px keeps the projection identical at every screen
 * size, which is what makes `planeHeightPct` exact.
 *
 * A close camera is what buys vertical room: it spends more of the box height
 * on the near rows, which is where formations stack a keeper right below a
 * central defender. At ratio 3 those two cards overlapped by ~38px.
 */
export const PERSPECTIVE_RATIO = 1.6;

/**
 * How much wider than the real pitch the box is drawn. The near edge equals the
 * box width, so this is what makes the trapezoid's bottom broad enough to keep
 * a five-across midfield from colliding.
 */
export const HALF_PITCH_WIDEN = 1.7;

/**
 * Apparent height of the tilted plane as a fraction of its flat height.
 * Roughly cos(TILT_DEG); used so PitchFitFrame letterboxes the foreshortened box.
 */
export const TILT_SHRINK = Math.cos((TILT_DEG * Math.PI) / 180);

/** Lift cards off the grass so they stay readable after counter-rotation. */
export const CARD_LIFT_PX = 40;

/**
 * Apparent card size, as a fraction of the flat card. Cards are scaled back up
 * against their own perspective shrink (see `halfPitchCardScale`), so this is
 * the single knob for how much room every card takes on screen.
 */
export const CARD_SCALE = 0.8;

/** Camera distance in px for a pitch box of the given height. */
export function perspectivePx(boxHeight: number): number {
  return PERSPECTIVE_RATIO * boxHeight;
}

/**
 * Flat height the grass plane needs, as a percentage of the pitch box, so that
 * after `rotateX(TILT_DEG)` its projection exactly fills the box.
 *
 * A point `d` above the plane's bottom edge (which is the rotation axis and the
 * perspective origin) projects to `d·cosθ · P/(P + d·sinθ)`. Solving that for
 * `d` such that the projection equals the box height, with `P = p·boxHeight`,
 * gives `d/boxHeight = p / (p·cosθ − sinθ)` — independent of the box size.
 */
export function planeHeightPct(): number {
  const rad = (TILT_DEG * Math.PI) / 180;
  const p = PERSPECTIVE_RATIO;
  return (100 * p) / (p * Math.cos(rad) - Math.sin(rad));
}

// Cards are centred on their slot and lifted off the grass, so the outer rows
// need headroom or they float past the near/far edges of the tilted plane.
const Y_NEAR = 96;
const Y_FAR = 23;
const X_INSET_MIN = 4;
const X_INSET_MAX = 96;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Remap full-pitch formation slots onto the own half.
 * Keeper (highest y) ends near the near edge; strikers (lowest y) near the far edge.
 */
export function toHalfPitchSlots<T extends { x: number; y: number }>(
  slots: readonly T[],
): T[] {
  if (slots.length === 0) return [];

  let minY = Infinity;
  let maxY = -Infinity;
  for (const slot of slots) {
    if (slot.y < minY) minY = slot.y;
    if (slot.y > maxY) maxY = slot.y;
  }

  const span = maxY - minY;
  return slots.map((slot) => {
    const t = span > 0 ? (slot.y - minY) / span : 0.5;
    // High formation y (keeper) → near edge (high half-pitch y).
    const y = lerp(Y_FAR, Y_NEAR, t);
    const x = lerp(X_INSET_MIN, X_INSET_MAX, clamp(slot.x, 0, 100) / 100);
    return { ...slot, x, y };
  });
}

/**
 * Perspective shrink the browser applies to a card at `yPct` on the plane.
 *
 * Same geometry as `planeHeightPct`: the card sits `d` above the rotation axis,
 * which puts it `d·sinθ` further from the camera, minus the lift that pulls it
 * back toward the lens. Returns 1 before the box has been measured.
 */
export function halfPitchCardScale(yPct: number, boxHeight: number): number {
  if (boxHeight <= 0) return 1;
  const rad = (TILT_DEG * Math.PI) / 180;
  const camera = PERSPECTIVE_RATIO * boxHeight;
  const planeFlat = (boxHeight * planeHeightPct()) / 100;
  const above = (1 - yPct / 100) * planeFlat;
  const depth = above * Math.sin(rad) - CARD_LIFT_PX * Math.cos(rad);
  return camera / Math.max(1, camera + depth);
}

/**
 * Counter-rotation + lift so cards stand upright above the tilted grass, plus a
 * scale that cancels the depth shrink. Without that cancellation the far row
 * renders at ~57% and its names become unreadable on a TV; with it every card
 * takes the same space, so overlap depends only on slot spacing.
 */
export function halfPitchCardTransform(yPct: number, boxHeight: number): string {
  const scale = CARD_SCALE / halfPitchCardScale(yPct, boxHeight);
  return `scale(${scale}) translateZ(${CARD_LIFT_PX}px) rotateX(${-TILT_DEG}deg)`;
}

/** Parse `?pitch=half` for deep links; anything else is the full pitch. */
export function parsePitchLayout(value: string | null): PitchLayout {
  return value === "half" ? "halfPerspective" : "full";
}
