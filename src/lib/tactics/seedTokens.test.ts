import { describe, expect, it } from "vitest";
import { clampPercent, seedTacticTokens } from "./seedTokens";

describe("seedTacticTokens", () => {
  it("puts on-field players on slot coordinates", () => {
    const tokens = seedTacticTokens(
      [
        {
          playerId: "a",
          onField: true,
          absent: false,
          fieldSlotIndex: 1,
        },
        {
          playerId: "b",
          onField: false,
          absent: false,
          fieldSlotIndex: null,
        },
      ],
      [{ id: 1, x: 40, y: 70 }]
    );
    expect(tokens).toEqual([
      { playerId: "a", x: 40, y: 70, onBoard: true },
      { playerId: "b", x: 8, y: 0, onBoard: false },
    ]);
  });

  it("skips absent players", () => {
    const tokens = seedTacticTokens(
      [{ playerId: "a", onField: true, absent: true, fieldSlotIndex: 0 }],
      []
    );
    expect(tokens).toEqual([]);
  });
});

describe("clampPercent", () => {
  it("keeps values on the pitch", () => {
    expect(clampPercent(-4)).toBe(2);
    expect(clampPercent(150)).toBe(98);
    expect(clampPercent(50)).toBe(50);
  });
});
