import { describe, expect, it } from "vitest";
import { buildTransition } from "./transitions";

const field = (keys: string[]) => keys.map((playerKey, slotId) => ({ playerKey, slotId }));
function replay(previous: ReturnType<typeof field>, target: ReturnType<typeof field>) {
  const current = structuredClone(previous);
  const step = buildTransition(previous, target, 30);
  for (const action of step.actions) {
    const outgoing = current.find((entry) => entry.playerKey === action.playerOutKey)!;
    if (action.kind === "substitution") {
      expect(current.some((entry) => entry.playerKey === action.playerInKey)).toBe(false);
      outgoing.playerKey = action.playerInKey;
    } else {
      const incoming = current.find((entry) => entry.playerKey === action.playerInKey)!;
      [outgoing.playerKey, incoming.playerKey] = [incoming.playerKey, outgoing.playerKey];
    }
  }
  expect(current).toEqual([...target].sort((a, b) => a.slotId - b.slotId));
  return step;
}

describe("logical substitution transitions", () => {
  it("puts reserves straight into their target vacancies regardless of array order", () => {
    const previous = field(["keeper", "out-a", "out-b", "loek", "out-c"]);
    const target = field(["keeper", "max", "jody", "loek", "maceo"]).reverse();
    const step = replay(previous, target);
    expect(step.actions).toHaveLength(3);
    expect(step.actions.every((action) => action.kind === "substitution")).toBe(true);
    expect(step.actions.some((action) => action.playerOutKey === "loek" || action.playerInKey === "loek")).toBe(false);
  });
  it("keeps independent relocation chains separate instead of joining them through one player", () => {
    const step = replay(field(["keeper", "out-a", "loek", "out-b", "tygo"]), field(["keeper", "tygo", "jody", "loek", "max"]));
    expect(step.actions.filter((action) => action.kind === "positionSwap")).toHaveLength(2);
  });
  it("reaches every four-slot destination with retained players and two reserves", () => {
    const keys = ["a", "b", "c", "d", "reserve-1", "reserve-2"];
    for (const a of keys) for (const b of keys) for (const c of keys) for (const d of keys) {
      if (new Set([a, b, c, d]).size !== 4) continue;
      const previous = field(["keeper", "a", "b", "c", "d"]);
      const snapshot = structuredClone(previous);
      const step = replay(previous, field(["keeper", a, b, c, d]));
      expect(step.actions.some((action) => action.playerOutKey === "keeper" || action.playerInKey === "keeper")).toBe(false);
      expect(previous).toEqual(snapshot);
    }
  });
});
