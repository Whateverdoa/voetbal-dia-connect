import { describe, expect, it } from "vitest";
import { computeActualElapsedMs, computeElapsedMs, formatElapsed } from "./engine";
import type { MatchClockSnapshot } from "./types";

const start = 1_000_000;
function snapshot(count = 2, minutes = 30, margin = 10): MatchClockSnapshot {
  return { status: "live", currentQuarter: 2, quarterCount: count,
    regulationDurationMinutes: count * minutes,
    refereeClock: { elapsedMs: (minutes + 1) * 60_000, periodStartedElapsedMs: (minutes + 1) * 60_000,
      runningSince: start, safetyMarginMinutes: margin } };
}

describe("official nominal clock", () => {
  for (const [count, minutes] of [[2, 30], [2, 45], [4, 15]]) {
    for (const margin of [0, 10, 30]) {
      it(`${count}x${minutes}, margin ${margin}: starts at nominal base and stops exactly after 600 minutes`, () => {
        const state = snapshot(count, minutes, margin);
        expect(computeElapsedMs(state, start)).toBe(minutes * 60_000);
        expect(computeElapsedMs(state, start + 5_000)).toBe(minutes * 60_000 + 5_000);
        expect(computeElapsedMs(state, start + 600 * 60_000)).toBe((2 * minutes + margin) * 60_000);
        expect(computeActualElapsedMs(state, start + 600 * 60_000)).toBe((2 * minutes + margin + 1) * 60_000);
      });
    }
  }
  it("matches 2P23BS final values without altering its actual total", () => {
    const state = snapshot(); state.status = "finished";
    state.refereeClock = { elapsedMs: 4_296_254, periodStartedElapsedMs: 1_896_254, runningSince: null, safetyMarginMinutes: 10 };
    expect(formatElapsed(computeElapsedMs(state, start)!)).toBe("70:00");
    expect(formatElapsed(computeActualElapsedMs(state, start)!)).toBe("71:36");
    expect(state.refereeClock.elapsedMs).toBe(4_296_254);
  });
  it("freezes ordinary pauses, does not add interruption time and uses the upcoming nominal boundary at halftime", () => {
    const state = snapshot(); state.refereeClock!.runningSince = null;
    state.refereeClock!.elapsedMs += 5_000;
    expect(computeElapsedMs(state, start + 600 * 60_000)).toBe(30 * 60_000 + 5_000);
    state.status = "halftime"; state.currentQuarter = 1; state.refereeClock!.periodStartedElapsedMs = 0;
    expect(computeElapsedMs(state, start + 600 * 60_000)).toBe(30 * 60_000);
  });
  it("does not manufacture time when a policy-backed anchor is missing or unreliable", () => {
    const state = snapshot(); state.refereeClock!.periodStartedElapsedMs = undefined;
    state.frozenClockMs = 600 * 60_000;
    expect(computeElapsedMs(state, start)).toBeNull();
    state.status = "finished";
    expect(computeElapsedMs(state, start)).toBeNull();
    state.refereeClock!.periodStartedElapsedMs = 0;
    state.refereeClock!.clockReviewReason = "unknown_anchor";
    expect(computeElapsedMs(state, start)).toBeNull();
  });
});
