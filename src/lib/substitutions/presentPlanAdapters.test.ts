import { describe, expect, it } from "vitest";
import type { Id } from "@/convex/_generated/dataModel";
import { projectSubstitutionPlan } from "./projectSubstitutionPlan";
import {
  fieldPositionLookup,
  planKindLabel,
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
    expect(
      presentRowLabel({
        kind: "substitution",
        outDisplayName: "Jan Jansen",
        inDisplayName: "Piet Pietersen",
      })
    ).toBe("Jan → Piet");
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

  it("appends shirt numbers when a lookup is provided", () => {
    const numbers = new Map<string, number | null>([
      ["a", 7],
      ["b", 10],
      ["c", null],
    ]);
    expect(
      presentRowLabel(
        {
          kind: "substitution",
          outDisplayName: "Piet Pietersen",
          inDisplayName: "Jan Jansen",
          playerOutId: "a" as Id<"players">,
          playerInId: "b" as Id<"players">,
        },
        numbers
      )
    ).toBe("Piet 7 → Jan 10");
    expect(
      presentRowLabel(
        {
          kind: "positionSwap",
          outDisplayName: "Piet",
          inDisplayName: "Henk",
          playerOutId: "a" as Id<"players">,
          playerInId: "c" as Id<"players">,
        },
        numbers
      )
    ).toBe("Piet 7 ↔ Henk");
    expect(
      presentRowLabel(
        {
          kind: "substitution",
          outDisplayName: "Piet",
          inDisplayName: "Ghost",
          playerOutId: "a" as Id<"players">,
          playerInId: "missing" as Id<"players">,
        },
        numbers
      )
    ).toBe("Piet 7 → Ghost");
  });

  it("appends the position each player holds on the field", () => {
    const numbers = new Map<string, number | null>([
      ["a", 8],
      ["b", 5],
      ["c", 11],
    ]);
    const positions = new Map<string, string>([
      ["a", "CB"],
      ["c", "ST"],
    ]);

    // Substitution: only the outgoing player stands in a slot, the other is on
    // the bench and therefore has no position to show yet.
    expect(
      presentRowLabel(
        {
          kind: "substitution",
          outDisplayName: "Miloud",
          inDisplayName: "Revi",
          playerOutId: "a" as Id<"players">,
          playerInId: "b" as Id<"players">,
        },
        numbers,
        positions
      )
    ).toBe("Miloud 8 (CB) → Revi 5");

    // Position swap: both stand in a slot, so both positions show and the row
    // says exactly which two positions trade places.
    expect(
      presentRowLabel(
        {
          kind: "positionSwap",
          outDisplayName: "Miloud",
          inDisplayName: "Tygo",
          playerOutId: "a" as Id<"players">,
          playerInId: "c" as Id<"players">,
        },
        numbers,
        positions
      )
    ).toBe("Miloud 8 (CB) ↔ Tygo 11 (ST)");
  });
});

describe("planKindLabel", () => {
  it("names both kinds and treats a missing kind as a bench substitution", () => {
    expect(planKindLabel("substitution")).toBe("Wissel");
    expect(planKindLabel("positionSwap")).toBe("Positiewissel");
    expect(planKindLabel(undefined)).toBe("Wissel");
  });
});

describe("fieldPositionLookup", () => {
  const slots = [
    { id: 0, position: "GK" },
    { id: 3, position: "CB" },
    { id: 7, position: "ST" },
  ];

  it("maps players onto the position of the slot they occupy", () => {
    const lookup = fieldPositionLookup(
      [
        { playerId: "keeper" as Id<"players">, fieldSlotIndex: 0 },
        { playerId: "defender" as Id<"players">, fieldSlotIndex: 3 },
      ],
      slots
    );
    expect(lookup.get("keeper")).toBe("GK");
    expect(lookup.get("defender")).toBe("CB");
  });

  it("skips players without a slot and slots outside the formation", () => {
    const lookup = fieldPositionLookup(
      [
        { playerId: "bench" as Id<"players">, fieldSlotIndex: undefined },
        { playerId: "stale" as Id<"players">, fieldSlotIndex: 99 },
      ],
      slots
    );
    expect(lookup.size).toBe(0);
  });
});

describe("toMatchPlayers injured", () => {
  it("copies injured onto MatchPlayer so projection excludes them", () => {
    const players: PresentPlanPlayer[] = [
      {
        playerId: "a",
        displayName: "A.",
        number: 7,
        onField: true,
        fieldSlotIndex: 1,
        isKeeper: false,
        absent: false,
        injured: false,
      },
      {
        playerId: "b",
        displayName: "B.",
        number: 9,
        onField: false,
        fieldSlotIndex: null,
        isKeeper: false,
        absent: false,
        injured: true,
      },
    ];

    const mapped = toMatchPlayers(players);
    expect(mapped[1]?.injured).toBe(true);

    const result = projectSubstitutionPlan(mapped, []);
    expect(result.startingBench.map((p) => p.name)).not.toContain("B.");
  });
});
