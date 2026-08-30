import { describe, expect, it } from "vitest";
import { pickPresentMatch } from "./pickPresentMatch";

describe("pickPresentMatch", () => {
  it("prefers a live match over scheduled", () => {
    const picked = pickPresentMatch([
      { status: "scheduled", scheduledAt: 200 },
      { status: "live", scheduledAt: 100 },
    ]);
    expect(picked?.status).toBe("live");
  });

  it("falls back to the latest scheduled match", () => {
    const picked = pickPresentMatch([
      { status: "finished", scheduledAt: 300 },
      { status: "scheduled", scheduledAt: 100 },
      { status: "scheduled", scheduledAt: 200 },
    ]);
    expect(picked?.scheduledAt).toBe(200);
  });

  it("returns undefined when nothing is presentable", () => {
    expect(pickPresentMatch([{ status: "finished" }])).toBeUndefined();
  });
});
