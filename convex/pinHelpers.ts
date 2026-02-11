/**
 * PIN verification helpers shared across clock and match mutations.
 */
import { Doc } from "./_generated/dataModel";

/**
 * Verify that the given PIN is valid for clock/score control.
 * Accepts the coach PIN, or the assigned referee's PIN.
 *
 * The referee doc must be pre-fetched by the caller (via match.refereeId)
 * to avoid redundant DB reads across multiple helpers.
 */
export function verifyClockPin(
  match: Doc<"matches">,
  pin: string,
  referee?: Doc<"referees"> | null,
): boolean {
  if (match.coachPin === pin) return true;
  if (referee && match.refereeId && referee._id === match.refereeId) {
    return referee.pin === pin;
  }
  return false;
}

/**
 * Verify that the given PIN is the coach PIN.
 * Used for coach-only mutations (lineup, goals, referee assignment, etc.).
 */
export function verifyCoachPin(match: Doc<"matches">, pin: string): boolean {
  return match.coachPin === pin;
}
