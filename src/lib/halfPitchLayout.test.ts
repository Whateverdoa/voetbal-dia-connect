import { describe, expect, it } from "vitest";
import {
  parsePitchLayout,
  perspectivePx,
  planeHeightPct,
  toHalfPitchSlots,
  PERSPECTIVE_RATIO,
  TILT_DEG,
  TILT_SHRINK,
  CARD_LIFT_PX,
  CARD_SCALE,
  HALF_PITCH_WIDEN,
  halfPitchCardScale,
  halfPitchCardTransform,
} from "./halfPitchLayout";

const EIGHT = [
  { id: 0, x: 50, y: 90, position: "GK" },
  { id: 1, x: 80, y: 70, position: "RB" },
  { id: 2, x: 50, y: 75, position: "CB" },
  { id: 7, x: 50, y: 20, position: "ST" },
];

const ELEVEN = [
  { id: 0, x: 50, y: 93, position: "GK" },
  { id: 9, x: 50, y: 22, position: "ST" },
  { id: 10, x: 10, y: 28, position: "LW" },
];

describe("toHalfPitchSlots", () => {
  it("puts the keeper near the camera and the striker far away", () => {
    const [keeper, , , striker] = toHalfPitchSlots(EIGHT);
    expect(keeper!.y).toBeGreaterThan(striker!.y);
    expect(keeper!.y).toBeCloseTo(96, 5);
    expect(striker!.y).toBeCloseTo(23, 5);
  });

  it("keeps both outer rows clear of the plane edges", () => {
    const mapped = toHalfPitchSlots(EIGHT);
    for (const slot of mapped) {
      expect(slot.y).toBeGreaterThanOrEqual(23);
      expect(slot.y).toBeLessThanOrEqual(96);
    }
  });

  it("preserves relative y-order for an 11v11 formation", () => {
    const mapped = toHalfPitchSlots(ELEVEN);
    const byId = new Map(mapped.map((s) => [s.id, s]));
    expect(byId.get(0)!.y).toBeGreaterThan(byId.get(10)!.y);
    expect(byId.get(10)!.y).toBeGreaterThan(byId.get(9)!.y);
  });

  it("keeps relative spacing ratios along y", () => {
    const mapped = toHalfPitchSlots(EIGHT);
    const origSpan = 90 - 20;
    const mapSpan = mapped[0]!.y - mapped[3]!.y;
    const midOrig = (75 - 20) / origSpan;
    const midMap = (mapped[2]!.y - mapped[3]!.y) / mapSpan;
    expect(midMap).toBeCloseTo(midOrig, 5);
  });

  it("insets extreme x so near-edge cards are not clipped", () => {
    const [wide] = toHalfPitchSlots([{ x: 0, y: 50 }]);
    const [other] = toHalfPitchSlots([{ x: 100, y: 50 }]);
    expect(wide!.x).toBe(4);
    expect(other!.x).toBe(96);
  });

  it("falls back to mid-half when every slot shares the same y", () => {
    const mapped = toHalfPitchSlots([
      { x: 30, y: 50 },
      { x: 70, y: 50 },
    ]);
    expect(mapped[0]!.y).toBeCloseTo(59.5, 5);
    expect(mapped[1]!.y).toBeCloseTo(59.5, 5);
  });

  it("returns an empty list for an empty formation", () => {
    expect(toHalfPitchSlots([])).toEqual([]);
  });
});

describe("parsePitchLayout", () => {
  it("reads the half deep-link and defaults everything else to full", () => {
    expect(parsePitchLayout("half")).toBe("halfPerspective");
    expect(parsePitchLayout(null)).toBe("full");
    expect(parsePitchLayout("full")).toBe("full");
  });
});

describe("perspective constants", () => {
  it("keeps TILT_SHRINK in sync with TILT_DEG", () => {
    expect(TILT_SHRINK).toBeCloseTo(Math.cos((TILT_DEG * Math.PI) / 180), 8);
    expect(TILT_SHRINK).toBeGreaterThan(0.3);
    expect(TILT_SHRINK).toBeLessThan(0.8);
  });

  it("lifts cards off the grass with a counter-rotation", () => {
    expect(CARD_LIFT_PX).toBeGreaterThan(0);
    expect(halfPitchCardTransform(96, 0)).toBe(
      `scale(${CARD_SCALE}) translateZ(${CARD_LIFT_PX}px) rotateX(${-TILT_DEG}deg)`,
    );
  });

  it("widens the box so the near edge has room for a full row", () => {
    expect(HALF_PITCH_WIDEN).toBeGreaterThan(1);
  });

  it("shrinks far cards more than near cards", () => {
    const box = 518;
    const far = halfPitchCardScale(23, box);
    const near = halfPitchCardScale(96, box);
    expect(far).toBeLessThan(near);
    expect(far).toBeGreaterThan(0.3);
    expect(near).toBeCloseTo(1, 1);
  });

  it("scales cards up by exactly the depth shrink it measured", () => {
    const box = 518;
    for (const y of [23, 50, 96]) {
      const shrink = halfPitchCardScale(y, box);
      expect(halfPitchCardTransform(y, box)).toContain(
        `scale(${CARD_SCALE / shrink})`,
      );
    }
  });

  it("falls back to a plain scale before the box is measured", () => {
    expect(halfPitchCardScale(50, 0)).toBe(1);
  });

  it("scales the camera distance with the box height", () => {
    expect(perspectivePx(400)).toBe(PERSPECTIVE_RATIO * 400);
    expect(perspectivePx(0)).toBe(0);
  });

  it("sizes the plane so its projection exactly fills the box", () => {
    const rad = (TILT_DEG * Math.PI) / 180;
    for (const boxHeight of [200, 413, 654, 1080]) {
      const planeHeight = (planeHeightPct() / 100) * boxHeight;
      const camera = perspectivePx(boxHeight);
      // Projection of the plane's far edge onto the screen.
      const projected =
        (planeHeight * Math.cos(rad) * camera) /
        (camera + planeHeight * Math.sin(rad));
      expect(projected).toBeCloseTo(boxHeight, 6);
    }
  });

  it("needs a taller plane than the flat cosine estimate", () => {
    expect(planeHeightPct()).toBeGreaterThan(100 / TILT_SHRINK);
  });
});
