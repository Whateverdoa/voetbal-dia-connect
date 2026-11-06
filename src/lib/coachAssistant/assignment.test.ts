import { describe, expect, it } from "vitest";
import { assignField } from "./assignment";
import type { AssistantPlayer, PlayerEvidence } from "./types";

function player(key: string, primaryPosition: string, secondaryPosition: string | null = null): AssistantPlayer {
  return { key, primaryPosition, secondaryPosition, availability: "present" };
}

function choose(players: AssistantPlayer[], overrides: Partial<Parameters<typeof assignField>[0]> = {}) {
  const evidence = new Map<string, PlayerEvidence>(players.map(({ key }) => [key, {
    playerKey: key, fieldMinutes: 30, eligibleFieldMinutes: 60, confirmedGames: 1,
    starts: null, sourceIds: [], previousPositions: [],
  }]));
  return assignField({ players, slots: [{ id: 1, position: "CB" }], evidence,
    plannedMinutes: new Map(), duration: 60, useMinutes: false, useStarts: false,
    reference: [], kickoff: false, ...overrides });
}

describe("soft position preferences after minutes", () => {
  it("uses a first preference ahead of a second preference or merely the same line at equal minutes", () => {
    expect(choose([player("a", "LB"), player("b", "ST", "CB"), player("c", "CB")]))
      .toEqual([{ playerKey: "c", slotId: 1 }]);
    expect(choose([player("a", "LB"), player("b", "ST", "CB")]))
      .toEqual([{ playerKey: "b", slotId: 1 }]);
  });

  it("improves positions within the same line when worth relocating, without extra substitutions", () => {
    expect(choose([player("a", "CB"), player("b", "LB")], {
      slots: [{ id: 1, position: "LB" }, { id: 2, position: "CB" }],
      reference: [{ playerKey: "a", slotId: 1 }, { playerKey: "b", slotId: 2 }],
    })).toEqual([{ playerKey: "b", slotId: 1 }, { playerKey: "a", slotId: 2 }]);
  });

  it("gives the player with fewer current minutes a turn even outside their preferred line", () => {
    expect(choose([player("a", "CB"), player("b", "ST")], {
      plannedMinutes: new Map([["a", 10], ["b", 0]]),
    })).toEqual([{ playerKey: "b", slotId: 1 }]);
  });

  it("also keeps verified historical minutes ahead of position preferences", () => {
    const players = [player("a", "CB"), player("b", "ST")];
    const evidence = new Map<string, PlayerEvidence>(players.map(({ key }) => [key, {
      playerKey: key, fieldMinutes: key === "a" ? 40 : 20, eligibleFieldMinutes: 60,
      confirmedGames: 1, starts: null, sourceIds: ["previous"], previousPositions: [],
    }]));
    expect(choose(players, { evidence, useMinutes: true, kickoff: true }))
      .toEqual([{ playerKey: "b", slotId: 1 }]);
  });
});
