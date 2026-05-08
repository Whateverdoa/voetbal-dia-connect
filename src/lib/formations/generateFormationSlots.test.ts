import { describe, it, expect } from "vitest";
import { generateFormationSlotsFromStructure } from "./generateFormationSlots";

describe("generateFormationSlotsFromStructure", () => {
  it("builds 8 players for 8v8 1-5-2", () => {
    const { slots } = generateFormationSlotsFromStructure("8v8", "1-5-2");
    expect(slots).toHaveLength(8);
    expect(slots[0]?.position).toBe("GK");
  });

  it("builds 11 players for 11v11 1-4-2-3-1", () => {
    const { slots } = generateFormationSlotsFromStructure("11v11", "1-4-2-3-1");
    expect(slots).toHaveLength(11);
    expect(slots[0]?.position).toBe("GK");
  });

  it("throws when sum does not match", () => {
    expect(() => generateFormationSlotsFromStructure("8v8", "1-2-2")).toThrow();
  });
});
