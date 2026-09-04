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
        name: "Jan Jansen",
        number: 7,
        onField: true,
        isKeeper: false,
      },
      {
        matchPlayerId: "mp2" as Id<"matchPlayers">,
        playerId: "b" as Id<"players">,
        name: "Piet Pieters",
        number: 12,
        onField: false,
        isKeeper: false,
      },
    ];
    expect(names(players)).toBe("Jan 7, Piet 12");
    expect(names([])).toBe("geen");
  });

  it("picks helft vs kwart wording", () => {
    expect(periodWord(2)).toBe("helft");
    expect(periodWord(4)).toBe("kwart");
  });

  it("builds compact timing labels for quarter, minute, both, and neither", () => {
    expect(
      timingLabel(plan({ _id: "1" as Id<"substitutionPlans">, kind: "substitution", status: "pending", targetQuarter: 2, targetMinute: 15 }), 4)
    ).toBe("K2 · ~15");
    expect(
      timingLabel(plan({ _id: "2" as Id<"substitutionPlans">, kind: "substitution", status: "pending", targetQuarter: 1 }), 2)
    ).toBe("H1");
    expect(
      timingLabel(plan({ _id: "3" as Id<"substitutionPlans">, kind: "substitution", status: "pending", targetMinute: 40 }), 4)
    ).toBe("~40'");
    expect(
      timingLabel(plan({ _id: "4" as Id<"substitutionPlans">, kind: "substitution", status: "pending" }), 4)
    ).toBe("—");
  });

  it("labels substitutions and position swaps with first names and numbers", () => {
    const sub = plan({
      _id: "s" as Id<"substitutionPlans">,
      kind: "substitution",
      status: "pending",
      outName: "Jody van der Bijl",
      inName: "Luc van Hapsert",
      outNumber: 4,
      inNumber: 1,
    });
    const swap = plan({
      _id: "p" as Id<"substitutionPlans">,
      kind: "positionSwap",
      status: "pending",
      outName: "Jan Jansen",
      inName: "Piet Pieters",
      outNumber: 7,
      inNumber: 12,
    });

    expect(rowKind(sub)).toBe("substitution");
    expect(rowLabel(sub)).toBe("Jody 4 → Luc 1");
    expect(rowBadge(sub)).toBe("Wissel");
    expect(rowBadgeClass(sub)).toContain("amber");

    expect(rowKind(swap)).toBe("positionSwap");
    expect(rowLabel(swap)).toBe("Jan 7 ↔ Piet 12");
    expect(rowBadge(swap)).toBe("Positiewissel");
    expect(rowBadgeClass(swap)).toContain("sky");
  });
});
