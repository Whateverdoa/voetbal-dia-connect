import { describe, expect, it } from "vitest";
import { containBox } from "./pitchFit";
import { orientAspect, orientSlots } from "./pitchOrientation";

const KEEPER = { id: 0, x: 50, y: 90, position: "GK" };
const STRIKER = { id: 7, x: 50, y: 20, position: "ST" };
const RIGHT_BACK = { id: 1, x: 80, y: 70, position: "RB" };

describe("orientSlots", () => {
  it("leaves portrait coordinates untouched", () => {
    expect(orientSlots([KEEPER, STRIKER], "portrait")).toEqual([KEEPER, STRIKER]);
  });

  it("puts the keeper left and the striker right in landscape", () => {
    const [keeper, striker] = orientSlots([KEEPER, STRIKER], "landscape");
    expect(keeper.x).toBe(10);
    expect(striker.x).toBe(80);
  });

  it("keeps the right back below the halfway line of the screen", () => {
    const [back] = orientSlots([RIGHT_BACK], "landscape");
    expect(back).toEqual({ id: 1, x: 30, y: 80, position: "RB" });
  });

  it("stays inside the pitch for every corner coordinate", () => {
    const corners = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },
      { x: 100, y: 100 },
    ];
    for (const slot of orientSlots(corners, "landscape")) {
      expect(slot.x).toBeGreaterThanOrEqual(0);
      expect(slot.x).toBeLessThanOrEqual(100);
      expect(slot.y).toBeGreaterThanOrEqual(0);
      expect(slot.y).toBeLessThanOrEqual(100);
    }
  });
});

describe("orientAspect", () => {
  it("swaps the axes for landscape", () => {
    expect(orientAspect(425, 640, "landscape")).toEqual({
      aspectW: 640,
      aspectH: 425,
    });
    expect(orientAspect(425, 640, "portrait")).toEqual({
      aspectW: 425,
      aspectH: 640,
    });
  });

  it("more than doubles the pitch area on a 16:9 screen", () => {
    const portrait = containBox(1920, 900, 425, 640);
    const { aspectW, aspectH } = orientAspect(425, 640, "landscape");
    const landscape = containBox(1920, 900, aspectW, aspectH);
    expect(landscape.width * landscape.height).toBeGreaterThan(
      portrait.width * portrait.height * 2,
    );
  });
});
