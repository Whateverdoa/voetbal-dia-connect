import { describe, expect, it } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";
import type { MatchPlayer, SubstitutionPlanRow } from "@/components/match/types";
import {
  names,
  periodWord,
  rowBadge,
  rowBadgeClass,
  rowKind,
  rowLabel,
  timingLabel,
} from "./planLabels";

const matchId = "match1" as Id<"matches">;

function plan(
  overrides: Partial<SubstitutionPlanRow> &
    Pick<SubstitutionPlanRow, "_id" | "kind" | "status">
): SubstitutionPlanRow {
  return {
    matchId,
    sequence: 0,
    playerOutId: "a" as Id<"players">,
    playerInId: "b" as Id<"players">,
    createdAt: 1,
    updatedAt: 1,
    outName: "Jan",
    inName: "Piet",
    ...overrides,
  };
}

describe("planLabels", () => {
  it("formats player name lists and empty bank", () => {
    const players: MatchPlayer[] = [
      {
        matchPlayerId: "mp1" as Id<"matchPlayers">,
        playerId: "a" as Id<"players">,
        name: "Jan",
        onField: true,
        isKeeper: false,
      },
      {
        matchPlayerId: "mp2" as Id<"matchPlayers">,
        playerId: "b" as Id<"players">,
        name: "Piet",
        onField: false,
        isKeeper: false,
      },
    ];
    expect(names(players)).toBe("Jan, Piet");
    expect(names([])).toBe("geen");
  });

  it("picks helft vs kwart wording", () => {
    expect(periodWord(2)).toBe("helft");
    expect(periodWord(4)).toBe("kwart");
  });

  it("builds timing labels for quarter, minute, both, and neither", () => {
    expect(
      timingLabel(plan({ _id: "1" as Id<"substitutionPlans">, kind: "substitution", status: "pending", targetQuarter: 2, targetMinute: 15 }), 4)
    ).toBe("kwart 2 · min ~15");
    expect(
      timingLabel(plan({ _id: "2" as Id<"substitutionPlans">, kind: "substitution", status: "pending", targetQuarter: 1 }), 2)
    ).toBe("start helft 1");
    expect(
      timingLabel(plan({ _id: "3" as Id<"substitutionPlans">, kind: "substitution", status: "pending", targetMinute: 40 }), 4)
    ).toBe("min ~40");
    expect(
      timingLabel(plan({ _id: "4" as Id<"substitutionPlans">, kind: "substitution", status: "pending" }), 4)
    ).toBe("start kwart");
  });

  it("labels substitutions and position swaps distinctly", () => {
    const sub = plan({
      _id: "s" as Id<"substitutionPlans">,
      kind: "substitution",
      status: "pending",
    });
    const swap = plan({
      _id: "p" as Id<"substitutionPlans">,
      kind: "positionSwap",
      status: "pending",
    });

    expect(rowKind(sub)).toBe("substitution");
    expect(rowLabel(sub)).toBe("Jan → Piet");
    expect(rowBadge(sub)).toBe("Wissel");
    expect(rowBadgeClass(sub)).toContain("amber");

    expect(rowKind(swap)).toBe("positionSwap");
    expect(rowLabel(swap)).toBe("Jan ↔ Piet");
    expect(rowBadge(swap)).toBe("Positiewissel");
    expect(rowBadgeClass(swap)).toContain("sky");
  });
});
