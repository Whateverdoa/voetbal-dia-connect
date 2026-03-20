import { describe, expect, it } from "vitest";
import type { Id } from "../_generated/dataModel";
import { testHelpers, type RuntimeUserAccess } from "./userAccess";

function runtimeAccess(
  overrides: Partial<RuntimeUserAccess> = {}
): RuntimeUserAccess {
  return {
    email: "coach@dia.local",
    roles: ["coach"],
    active: true,
    ...overrides,
  };
}

describe("userAccess runtime fallback", () => {
  it("returns derived access when no userAccess row exists", () => {
    const derived = runtimeAccess({
      coachId: "coach-1" as Id<"coaches">,
    });

    expect(testHelpers.mergeRuntimeUserAccess(null, derived)).toEqual(derived);
  });

  it("augments active access with derived coach role data", () => {
    const existing = runtimeAccess({
      roles: ["admin"],
      coachId: undefined,
      refereeId: undefined,
    });
    const derived = runtimeAccess({
      roles: ["coach"],
      coachId: "coach-1" as Id<"coaches">,
    });

    expect(testHelpers.mergeRuntimeUserAccess(existing, derived)).toEqual({
      email: "coach@dia.local",
      roles: ["admin", "coach"],
      active: true,
      coachId: "coach-1",
      refereeId: undefined,
    });
  });

  it("keeps explicit inactive access blocked", () => {
    const existing = runtimeAccess({
      active: false,
      roles: ["admin"],
    });
    const derived = runtimeAccess({
      coachId: "coach-1" as Id<"coaches">,
    });

    expect(testHelpers.mergeRuntimeUserAccess(existing, derived)).toBeNull();
  });
});
