import { describe, expect, it } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";
import { projectSubstitutionPlan } from "./projectSubstitutionPlan";
import {
  presentRowLabel,
  timingLabel,
  toMatchPlayers,
  toPlanRows,
  type PresentPlanPlayer,
  type PresentPlanRow,
} from "./presentPlanAdapters";

describe("presentPlanAdapters", () => {
  it("maps displayName onto MatchPlayer.name for projection", () => {
    const players: PresentPlanPlayer[] = [
      {
        playerId: "a",
        displayName: "A.",
        number: 7,
        onField: true,
        fieldSlotIndex: 1,
        isKeeper: false,
        absent: false,
      },
      {
        playerId: "b",
        displayName: "B.",
        number: 9,
        onField: false,
        fieldSlotIndex: null,
        isKeeper: false,
        absent: false,
      },
    ];
    const plans: PresentPlanRow[] = [
      {
        _id: "plan-0" as Id<"substitutionPlans">,
        matchId: "match-1" as Id<"matches">,
        sequence: 0,
        kind: "substitution",
        targetQuarter: 2,
        targetMinute: null,
        playerOutId: "a" as Id<"players">,
        playerInId: "b" as Id<"players">,
        status: "pending",
        note: null,
        outDisplayName: "A.",
        inDisplayName: "B.",
      },
    ];

    const result = projectSubstitutionPlan(
      toMatchPlayers(players),
      toPlanRows(plans),
      2
    );

    expect(result.quarterPreview?.projectedOnField.map((p) => p.name)).toEqual([
      "B.",
    ]);
    expect(presentRowLabel(plans[0]!)).toBe("A. → B.");
    expect(timingLabel(plans[0]!, 4)).toBe("start kwart 2");
  });

  it("labels position swaps and half timing", () => {
    expect(
      presentRowLabel({
        kind: "positionSwap",
        outDisplayName: "Jan",
        inDisplayName: "Piet",
      })
    ).toBe("Jan ↔ Piet");
    expect(
      timingLabel({ targetQuarter: 1, targetMinute: 8 }, 2)
    ).toBe("helft 1 · min ~8");
  });
});
