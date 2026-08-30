import { describe, expect, it } from "vitest";
import { clientToPitchPercent, tokenPercentFromPointer } from "./dragPosition";

describe("clientToPitchPercent", () => {
  const box = { left: 100, top: 50, width: 200, height: 100 };

  it("maps the box center to 50/50", () => {
    expect(clientToPitchPercent(200, 100, box)).toEqual({
      x: 50,
      y: 50,
      onBoard: true,
    });
  });

  it("marks pointers outside the pitch as off-board", () => {
    expect(clientToPitchPercent(200, 10, box).onBoard).toBe(false);
  });
});

describe("tokenPercentFromPointer", () => {
  it("preserves the grab offset so the token does not snap", () => {
    const next = tokenPercentFromPointer(
      { x: 40, y: 30, onBoard: true },
      { x: 6, y: -4 },
    );
    expect(next.x).toBe(34);
    expect(next.y).toBe(34);
  });
});
