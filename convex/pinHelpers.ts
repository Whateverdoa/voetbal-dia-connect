/**
 * PIN verification helpers shared across clock and match mutations.
 *
 * Coach access is now based on **team membership**: any coach whose
 * `teamIds` includes the match's `teamId` is authorised.  The old
 * single-owner `match.coachPin === pin` check is replaced everywhere.
 */
import { Doc, Id } from "./_generated/dataModel";
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
 * Check if a coach is allowed to perform lead-only actions.
 * Returns true if:
 * - No lead is assigned (open access for all coaches)
 * - The coach IS the current lead
 */
export function isMatchLead(
  match: Doc<"matches">,
  coachId: Id<"coaches">,
): boolean {
  if (!match.leadCoachId) return true; // no lead = open access
  return match.leadCoachId === coachId;
}
