import { expect, it } from "vitest";
import type { Doc } from "../_generated/dataModel";
import { applyRefereeClockCommand as apply } from "./refereeClockCommands";
import { projectRefereeClock } from "./refereeMatchPolicy";
const minute = 60_000;
function match() {
 return { status: "scheduled", currentQuarter: 1, quarterCount: 2, regulationDurationMinutes: 60, homeScore: 2, awayScore: 1,
  refereePolicy: { version: 1, generation: 1, commandVersion: 0, elapsedMs: 0, runningSince: null, periodStartedElapsedMs: 0, safetyMarginMinutes: 10, confirmedStoppageMs: 0 },
 } as Doc<"matches">;
}
it("pause stops playing time, counts real stoppage once and shifts the wall limit", () => {
 const start = apply(match(), { kind: "start" }, 1000).match;
 const pause = apply(start, { kind: "pause" }, 1000 + 12 * minute).match;
 const resume = apply(pause, { kind: "resume" }, 1000 + 18 * minute).match;
 expect(resume.refereePolicy).toMatchObject({ elapsedMs: 12 * minute, confirmedStoppageMs: 6 * minute, clockLimitAt: 1000 + 46 * minute });
 expect(projectRefereeClock(resume, 1000 + 600 * minute)!.state.elapsedMs).toBe(40 * minute);
 expect(resume).toMatchObject({ homeScore: 2, awayScore: 1 });
});
it("margin changes are absolute, do not resume and persist into the next period", () => {
 const start = apply(match(), { kind: "start" }, 1000).match;
 let raised = apply(start, { kind: "set_safety_margin", safetyMarginMinutes: 20 }, 1000 + 600 * minute).match;
 expect(raised.refereePolicy).toMatchObject({ elapsedMs: 40 * minute, runningSince: null, safetyMarginMinutes: 20 });
 raised = apply(raised, { kind: "set_safety_margin", safetyMarginMinutes: 20 }, 1000 + 601 * minute).match;
 expect(raised.refereePolicy!.clockLimitElapsedMs).toBe(50 * minute);
 const resumed = apply(raised, { kind: "resume" }, 1000 + 601 * minute).match;
 const ended = apply(resumed, { kind: "end_period" }, 1000 + 602 * minute).match;
 const next = apply(ended, { kind: "start_period" }, 1000 + 607 * minute).match;
 expect(next.refereePolicy).toMatchObject({ periodStartedElapsedMs: 41 * minute, clockLimitElapsedMs: 91 * minute, confirmedStoppageMs: 0 });
});
it("requires explicit review after 600 paused minutes and preserves the source", () => {
 const start = apply(match(), { kind: "start" }, 1000).match;
 const pause = apply(start, { kind: "pause" }, 1000 + minute).match;
 const now = 1000 + 601 * minute;
 for (const kind of ["resume", "end_period", "finish"] as const) {
  expect(() => apply(pause, { kind }, now)).toThrow("STOPPAGE_REVIEW_REQUIRED");
  expect(apply(pause, { kind, stoppageDisposition: "discard" }, now).match.refereePolicy!.confirmedStoppageMs).toBe(0);
  const included = apply(pause, { kind, stoppageDisposition: "include" }, now);
  expect(included.match.refereePolicy!.confirmedStoppageMs).toBe(600 * minute);
  expect(included.observedStoppageMs).toBe(600 * minute);
 }
 expect(pause.refereePolicy!.stoppageStartedAt).toBe(1000 + minute);
});
it("cannot restart/reset an active match or resume at the cap", () => {
 const started = apply(match(), { kind: "start" }, 1000).match;
 expect(() => apply(started, { kind: "start" }, 2000)).toThrow("MATCH_ALREADY_STARTED");
 expect(() => apply(started, { kind: "resume" }, 1000 + 600 * minute)).toThrow("CLOCK_REVIEW_REQUIRED");
});
it("blocks unknown anchors but still permits finishing", () => {
 const started = apply(match(), { kind: "start" }, 1000).match;
 started.refereePolicy!.periodStartedElapsedMs = undefined;
 expect(() => apply(started, { kind: "resume" }, 2000)).toThrow("CLOCK_REVIEW_REQUIRED");
 expect(apply(started, { kind: "finish" }, 2000).match.status).toBe("finished");
});
it("rejects invalid and decreasing active margins", () => {
 const started = apply(match(), { kind: "start" }, 1000).match;
 for (const safetyMarginMinutes of [-1, 31, 1.5, 9]) expect(() => apply(started, { kind: "set_safety_margin", safetyMarginMinutes }, 2000)).toThrow("VALIDATION_ERROR");
});
