import { describe, expect, it, vi } from "vitest";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { isOfficialLogType, mapOfficialLogEvent, listOfficialMatchEvents } from "./officialEvents";

function buildEvent(
  overrides: Partial<Doc<"matchEvents">> &
    Pick<Doc<"matchEvents">, "type">,
): Doc<"matchEvents"> {
  return {
    _id: "evt1" as Doc<"matchEvents">["_id"],
    _creationTime: 1,
    matchId: "m1" as Doc<"matchEvents">["matchId"],
    quarter: 1,
    timestamp: 1_700_000_000_000,
    createdAt: 1_700_000_000_000,
    ...overrides,
  };
}

describe("official events", () => {
  it("shows the coach's goal enrichment in the referee's registration log", async () => {
    const goal = buildEvent({ type: "goal", reportedNumber: 9 });
    const enrichment = buildEvent({
      _id: "evt2" as Doc<"matchEvents">["_id"], type: "goal_enrichment",
      targetEventId: goal._id, playerId: "p1" as Doc<"players">["_id"],
      assistKind: "penalty", createdAt: goal.createdAt + 1,
    });
    const ctx = {
      db: {
        query: vi.fn(() => ({ withIndex: () => ({ order: () => ({ take: async () => [enrichment, goal] }) }) })),
        get: vi.fn(async () => ({ _id: "p1", name: "Jan" })),
      },
    };
    const log = await listOfficialMatchEvents(ctx as unknown as QueryCtx, goal.matchId);
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ _id: goal._id, type: "goal", playerName: "Jan", assistKind: "penalty" });
  });
  it("keeps goals and cards on the official log", () => {
    expect(isOfficialLogType("goal")).toBe(true);
    expect(isOfficialLogType("yellow_card")).toBe(true);
    expect(isOfficialLogType("red_card")).toBe(true);
    expect(isOfficialLogType("sub_out")).toBe(false);
  });

  it("shows a reported shirt number when there is no roster name", () => {
    const mapped = mapOfficialLogEvent(
      buildEvent({
        type: "yellow_card",
        reportedNumber: 9,
      }),
      {},
    );
    expect(mapped.playerName).toBe("#9");
  });

  it("prefers the roster name when the player is known", () => {
    const mapped = mapOfficialLogEvent(
      buildEvent({
        type: "goal",
        playerId: "p1" as Doc<"matchEvents">["playerId"],
        reportedNumber: 10,
      }),
      { p1: "Jan" },
    );
    expect(mapped.playerName).toBe("Jan");
  });
});
