import { describe, expect, it } from "vitest";
import { findMatchingPendingPlanId } from "./matchPendingPlan";

describe("findMatchingPendingPlanId", () => {
  const plans = [
    {
      _id: "p0",
      sequence: 0,
      status: "pending",
      kind: "substitution" as const,
      playerOutId: "a",
      playerInId: "c",
    },
    {
      _id: "p1",
      sequence: 1,
      status: "pending",
      playerOutId: "a",
      playerInId: "c",
    },
    {
      _id: "p2",
      sequence: 2,
      status: "executed",
      playerOutId: "b",
      playerInId: "d",
    },
  ];

  it("returns the earliest matching pending substitution", () => {
    expect(
      findMatchingPendingPlanId(plans, { playerOutId: "a", playerInId: "c" })
    ).toBe("p0");
  });

  it("ignores executed rows and non-matches", () => {
    expect(
      findMatchingPendingPlanId(plans, { playerOutId: "b", playerInId: "d" })
    ).toBeNull();
  });
});
