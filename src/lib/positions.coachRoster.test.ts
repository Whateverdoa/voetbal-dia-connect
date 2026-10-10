import { describe, expect, it } from "vitest";
import { isValidPosition } from "./positions";

describe("coach roster position validation", () => {
  it("accepts known codes used by coaches", () => {
    expect(isValidPosition("GK")).toBe(true);
    expect(isValidPosition("CB")).toBe(true);
    expect(isValidPosition("ST")).toBe(true);
  });

  it("rejects free text", () => {
    expect(isValidPosition("spits")).toBe(false);
    expect(isValidPosition("")).toBe(false);
  });
});
