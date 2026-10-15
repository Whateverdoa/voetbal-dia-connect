import { expect, it } from "vitest";
import { projectPilotClock, type RefereeDetail } from "./refereePilot";
it.each([[2,30], [2,45], [4,15]])("cached web clock respects %i x %i across every supported margin", (periodCount, periodMinutes) => {
 for (const margin of [0,10,30]) {
  const match = { version: 4, clockGuardPending: false, periodCount, periodMinutes,
   clock: { elapsedMs: 0, runningSince: 1000, periodStartedElapsedMs: 0, safetyMarginMinutes: margin, confirmedStoppageMs: 0, regularTimeReached: false, clockLimitElapsedMs: (periodMinutes + margin) * 60000 },
  } as RefereeDetail;
  expect(projectPilotClock(match, 1000 + periodMinutes * 60000).remainingMs).toBe(0);
  expect(projectPilotClock(match, 1000 + 600 * 60000)).toMatchObject({ elapsedMs: (periodMinutes + margin) * 60000, reason: "period_limit", running: false, version: 5 });
  expect(projectPilotClock({ ...match, clockGuardPending: true }, 1000 + 600 * 60000).version).toBe(4);
 }
});
it("cached long pause freezes elapsed without silently booking stopped time", () => {
 const match = { version: 0, clockGuardPending: false, periodMinutes: 30,
  clock: { elapsedMs: 120000, runningSince: null, periodStartedElapsedMs: 0, safetyMarginMinutes: 10, confirmedStoppageMs: 5000, stoppageStartedAt: 1000, regularTimeReached: false, clockLimitElapsedMs: 2400000 } } as RefereeDetail;
 expect(projectPilotClock(match, 1000 + 600 * 60000)).toMatchObject({ elapsedMs: 120000, reason: "long_stoppage", version: 1, running: false });
 expect(match.clock?.confirmedStoppageMs).toBe(5000);
});
