import { describe, expect, it } from "vitest";
import { hasAdminRole } from "./adminOverride";

describe("hasAdminRole", () => {
  it("is true for an active admin", () => {
    expect(hasAdminRole({ active: true, roles: ["admin"] })).toBe(true);
  });

  it("is false for coaches and inactive admins", () => {
    expect(hasAdminRole({ active: true, roles: ["coach"] })).toBe(false);
    expect(hasAdminRole({ active: false, roles: ["admin"] })).toBe(false);
    expect(hasAdminRole(null)).toBe(false);
  });
});
