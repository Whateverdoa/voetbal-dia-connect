/**
 * PIN verification helpers shared across clock and match mutations.
 */
import { Doc } from "./_generated/dataModel";

/**
 * Verify that the given PIN is valid for clock control.
 * Accepts either the coach PIN or the referee PIN (if set).
 */
export function verifyClockPin(match: Doc<"matches">, pin: string): boolean {
  if (match.coachPin === pin) return true;
  if (match.refereePin != null && match.refereePin === pin) return true;
  return false;
}

/**
 * Verify that the given PIN is the coach PIN.
 * Used for coach-only mutations (lineup, goals, referee assignment, etc.).
 */
export function verifyCoachPin(match: Doc<"matches">, pin: string): boolean {
  return match.coachPin === pin;
}
