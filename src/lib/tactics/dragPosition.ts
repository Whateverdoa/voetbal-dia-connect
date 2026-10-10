import { clampPercent } from "./seedTokens";

export type PitchBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type PitchPercent = {
  x: number;
  y: number;
  onBoard: boolean;
};

export function clientToPitchPercent(
  clientX: number,
  clientY: number,
  box: PitchBox,
): PitchPercent {
  if (box.width <= 0 || box.height <= 0) {
    return { x: 50, y: 50, onBoard: true };
  }
  const x = ((clientX - box.left) / box.width) * 100;
  const y = ((clientY - box.top) / box.height) * 100;
  const onBoard = y >= 0 && y <= 100 && x >= 0 && x <= 100;
  return { x, y, onBoard };
}

/** Keep the grab point on the token so the piece does not jump to the finger. */
export function tokenPercentFromPointer(
  pointer: PitchPercent,
  grabOffset: { x: number; y: number },
): PitchPercent {
  const x = clampPercent(pointer.x - grabOffset.x);
  const y = clampPercent(pointer.y - grabOffset.y);
  return { x, y, onBoard: pointer.onBoard };
}
