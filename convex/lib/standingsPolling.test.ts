import { describe, expect, it } from "vitest";
import {
  getStandingsPollWindow,
  maxStandingsPollAttemptsForDay,
  nextStandingsPollAt,
  STANDINGS_POLL_INTERVAL_MS,
} from "./standingsPolling";

const time = (value: string) => Date.parse(value);

describe("bounded standings schedule", () => {
  it("reports daily budgets outside the execution window", () => {
    expect(maxStandingsPollAttemptsForDay(time("2026-11-01T22:00:00Z"))).toBe(44);
    expect(maxStandingsPollAttemptsForDay(time("2026-11-01T23:30:00Z"))).toBe(1);
    expect(maxStandingsPollAttemptsForDay(time("2026-10-30T23:30:00Z"))).toBe(44);
    expect(maxStandingsPollAttemptsForDay(time("2026-11-02T20:00:00Z"))).toBe(1);
    expect(maxStandingsPollAttemptsForDay(time("2026-11-03T20:00:00Z"))).toBe(0);
    expect(maxStandingsPollAttemptsForDay(time("2026-11-04T22:00:00Z"))).toBe(1);
  });
  it("has exactly 44 distinct weekend slots, including the last quarter hour", () => {
    const start = time("2026-10-31T00:00:00Z");
    const windows = Array.from({ length: 96 }, (_, index) =>
      getStandingsPollWindow(start + index * STANDINGS_POLL_INTERVAL_MS),
    ).filter((window) => window !== null);
    expect(windows).toHaveLength(44);
    expect(new Set(windows.map((window) => window.slot)).size).toBe(44);
    expect(windows.every((window) => window.maxAttempts === 44 &&
      window.amsterdamDate === "2026-10-31")).toBe(true);
    expect(getStandingsPollWindow(time("2026-11-01T20:59:59Z"))?.maxAttempts).toBe(44);
    expect(getStandingsPollWindow(time("2026-11-01T21:00:00Z"))).toBeNull();
  });

  it.each([
    ["2026-11-02T10:00:00Z", 1],
    ["2026-11-02T10:14:59Z", 1],
    ["2026-11-02T10:15:00Z", null],
    ["2026-11-04T20:00:00Z", 1],
    ["2026-11-04T20:14:59Z", 1],
    ["2026-11-04T20:15:00Z", null],
    ["2026-11-03T10:00:00Z", null],
    ["2026-10-31T09:59:59Z", null],
  ])("recognizes the window at %s", (date, attempts) => {
    expect(getStandingsPollWindow(time(date))?.maxAttempts ?? null).toBe(attempts);
  });

  it.each([
    ["2026-10-31T09:59:59Z", "2026-10-31T10:00:00Z"],
    ["2026-10-31T10:00:00Z", "2026-10-31T10:15:00Z"],
    ["2026-11-01T20:45:00Z", "2026-11-02T10:00:00Z"],
    ["2026-11-02T10:00:00Z", "2026-11-04T20:00:00Z"],
    ["2026-11-04T20:00:00Z", "2026-11-07T10:00:00Z"],
    ["2026-10-25T20:59:59Z", "2026-10-26T10:00:00Z"],
  ])("finds a strictly future slot after %s", (now, next) => {
    expect(nextStandingsPollAt(time(now))).toBe(time(next));
  });

  it("rejects invalid timestamps without searching indefinitely", () => {
    expect(getStandingsPollWindow(Number.NaN)).toBeNull();
    expect(() => nextStandingsPollAt(Number.NaN)).toThrow("Ongeldige tijd");
  });
});
