/**
 * Shared referee lookup helpers.
 *
 * Used by clock, score, and match mutations to resolve
 * the assigned referee for a match without duplicating DB reads.
 */
import { Doc } from "./_generated/dataModel";
import { GenericDatabaseReader } from "convex/server";
import { DataModel } from "./_generated/dataModel";

type DbReader = GenericDatabaseReader<DataModel>;

/**
 * Fetch the referee document assigned to a match (if any).
 * Returns null when the match has no referee assigned.
 */
export async function fetchRefereeForMatch(
  ctx: { db: DbReader },
  match: Doc<"matches">,
): Promise<Doc<"referees"> | null> {
  if (!match.refereeId) return null;
  return await ctx.db.get(match.refereeId);
}
