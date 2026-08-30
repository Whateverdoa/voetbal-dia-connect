/** Box that contains a pitch with a fixed aspect ratio (letterbox). */
export function containBox(
  availW: number,
  availH: number,
  aspectW: number,
  aspectH: number
): { width: number; height: number } {
  if (availW <= 0 || availH <= 0 || aspectW <= 0 || aspectH <= 0) {
    return { width: 0, height: 0 };
  }
  const ratio = aspectW / aspectH;
  let width = availW;
  let height = availW / ratio;
  if (height > availH) {
    height = availH;
    width = availH * ratio;
  }
  return { width, height };
}
