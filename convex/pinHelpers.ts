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
 * Verify that the given PIN is valid for clock/match-control actions.
 * Referee-first: when a referee is assigned, referee keeps full access.
 * When no referee is assigned, only the lead coach may control the clock.
 */
export async function verifyClockPin(
  ctx: { db: DbReader },
  match: Doc<"matches">,
  pin: string,
  referee?: Doc<"referees"> | null,
): Promise<boolean> {
  // Referee PIN: always allow when match has this referee assigned
  if (referee && match.refereeId && referee._id === match.refereeId) {
    if (referee.pin === pin) return true;
  }

  // Coach: require team membership
  const coach = await verifyCoachTeamMembership(ctx, match, pin);
  if (!coach) return false;

  // When referee is assigned: allow any team coach (backward compat)
  if (match.refereeId) return true;

  // When no referee: only lead coach may control clock
  return match.leadCoachId === coach._id;
}

/**
 * Verify that the given PIN belongs to the match lead (wedstrijdleider).
 * Returns the coach doc if they are the lead, null otherwise.
 */
export async function verifyIsMatchLead(
  ctx: { db: DbReader },
  match: Doc<"matches">,
  pin: string,
): Promise<Doc<"coaches"> | null> {
  const coach = await verifyCoachTeamMembership(ctx, match, pin);
  if (!coach || match.leadCoachId !== coach._id) return null;
  return coach;
}
