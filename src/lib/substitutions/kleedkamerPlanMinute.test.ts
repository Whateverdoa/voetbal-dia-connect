import { describe, expect, it } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";
import {
  addPlanPayload,
  parseMinuteDraft,
  pendingPlanIdsForMinuteUpdate,
  withMinuteDraft,
} from "./kleedkamerPlanMinute";

describe("kleedkamerPlanMinute", () => {
  it("parses a non-negative minute and rejects junk", () => {
    expect(parseMinuteDraft("15")).toBe(15);
    expect(parseMinuteDraft(" 0 ")).toBe(0);
    expect(parseMinuteDraft("")).toBeNull();
    expect(parseMinuteDraft("-1")).toBeNull();
    expect(parseMinuteDraft("x")).toBeNull();
  });

  it("overrides boundary timing when a minute is typed", () => {
    expect(
      withMinuteDraft(
        { targetQuarter: 1, insertAtQuarterBoundary: true },
        "12"
      )
    ).toEqual({
      targetQuarter: 1,
      targetMinute: 12,
      insertAtQuarterBoundary: false,
    });
  });

  it("leaves timing unchanged for an empty draft", () => {
    const timing = { targetQuarter: 1, insertAtQuarterBoundary: true };
    expect(withMinuteDraft(timing, "")).toEqual(timing);
  });

  it("builds addPlanItem args from timing", () => {
    expect(
      addPlanPayload(
        "m" as Id<"matches">,
        "out" as Id<"players">,
        "in" as Id<"players">,
        { targetQuarter: 1, targetMinute: 8, insertAtQuarterBoundary: false },
        "positionSwap"
      )
    ).toEqual({
      matchId: "m",
      playerOutId: "out",
      playerInId: "in",
      insertAtQuarterBoundary: false,
      kind: "positionSwap",
      targetQuarter: 1,
      targetMinute: 8,
    });
  });

  it("lists pending rows that still need the minute", () => {
    const planA = "a" as Id<"substitutionPlans">;
    const planB = "b" as Id<"substitutionPlans">;
    expect(
      pendingPlanIdsForMinuteUpdate(
        [
          { _id: planA, status: "pending", targetMinute: null },
          { _id: planB, status: "executed", targetMinute: null },
          {
            _id: "c" as Id<"substitutionPlans">,
            status: "pending",
            targetMinute: 12,
          },
        ],
        12
      )
    ).toEqual([planA]);
  });
});
