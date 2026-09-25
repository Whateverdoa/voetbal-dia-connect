import { describe, expect, it } from "vitest";
import type { Doc } from "../_generated/dataModel";
import { isOfficialLogType, mapOfficialLogEvent } from "./officialEvents";

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
