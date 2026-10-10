import { describe, expect, it } from "vitest";
import { containBox } from "./pitchFit";

describe("containBox", () => {
  it("fits a tall 11-tal pitch into a landscape fullscreen", () => {
    const box = containBox(1920, 900, 680, 1050);
    expect(box.height).toBe(900);
    expect(box.width).toBeCloseTo(900 * (680 / 1050), 5);
    expect(box.width).toBeLessThan(1920);
  });

  it("fits a pitch into a narrow column without overflowing height", () => {
    const box = containBox(400, 2000, 680, 1050);
    expect(box.width).toBe(400);
    expect(box.height).toBeCloseTo(400 / (680 / 1050), 5);
  });

  it("returns empty when the host has no size yet", () => {
    expect(containBox(0, 800, 680, 1050)).toEqual({ width: 0, height: 0 });
  });
});
