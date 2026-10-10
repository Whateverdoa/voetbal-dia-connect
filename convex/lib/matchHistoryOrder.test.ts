import { describe, expect, it } from "vitest";
import { compareSeasonHistory, matchKickoffMs } from "./matchHistoryOrder";

describe("matchHistoryOrder", () => {
  it("prefers scheduledAt over finishedAt", () => {
    expect(matchKickoffMs({ scheduledAt: 10, finishedAt: 99 })).toBe(10);
    expect(matchKickoffMs({ finishedAt: 99 })).toBe(99);
  });

  it("sorts the first match of the season first", () => {
    const first = { scheduledAt: 1_000 };
    const later = { scheduledAt: 2_000 };
    expect([later, first].sort(compareSeasonHistory)).toEqual([first, later]);
  });
});
