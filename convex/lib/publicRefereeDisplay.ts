import type { QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";

/**
 * Public spectator payloads: assignment is always visible; name only if referee opted in.
 */
export async function getPublicRefereeFields(
  ctx: QueryCtx,
  refereeId: Id<"referees"> | undefined
): Promise<{ refereeAssigned: boolean; refereePublicName: string | null }> {
  if (!refereeId) {
    return { refereeAssigned: false, refereePublicName: null };
  }
  const referee = await ctx.db.get(refereeId);
  if (!referee) {
    return { refereeAssigned: false, refereePublicName: null };
  }
  const showName = referee.showPublicName === true;
  return {
    refereeAssigned: true,
    refereePublicName: showName ? referee.name : null,
  };
}
