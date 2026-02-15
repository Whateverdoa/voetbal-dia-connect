/**
 * PIN verification helpers shared across clock and match mutations.
 *
 * Coach access is now based on **team membership**: any coach whose
 * `teamIds` includes the match's `teamId` is authorised.  The old
 * single-owner `match.coachPin === pin` check is replaced everywhere.
 */
import { Doc } from "./_generated/dataModel";
import { GenericDatabaseReader } from "convex/server";
import { DataModel } from "./_generated/dataModel";

type DbReader = GenericDatabaseReader<DataModel>;

/**
 * Verify that the given PIN belongs to a coach who is assigned to
 * the same team as the match.
 *
 * Returns the coach document on success, or `null` on failure.
 */
export async function verifyCoachTeamMembership(
  ctx: { db: DbReader },
  match: Doc<"matches">,
  pin: string,
): Promise<Doc<"coaches"> | null> {
  const coach = await ctx.db
    .query("coaches")
    .withIndex("by_pin", (q) => q.eq("pin", pin))
    .first();
  if (!coach) return null;
  if (!coach.teamIds.includes(match.teamId)) return null;
  return coach;
}

/**
 * Verify that the given PIN is valid for clock/score control.
 * Accepts any coach assigned to the match's team, **or** the
 * assigned referee's PIN.
 *
 * The referee doc must be pre-fetched by the caller (via match.refereeId)
 * to avoid redundant DB reads across multiple helpers.
 */
export async function verifyClockPin(
  ctx: { db: DbReader },
  match: Doc<"matches">,
  pin: string,
  referee?: Doc<"referees"> | null,
): Promise<boolean> {
  // Check coach team membership first
  const coach = await verifyCoachTeamMembership(ctx, match, pin);
  if (coach) return true;

  // Fall back to referee PIN
  if (referee && match.refereeId && referee._id === match.refereeId) {
    return referee.pin === pin;
  }
  return false;
}
