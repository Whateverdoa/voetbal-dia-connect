/**
 * Legacy helper names kept for backwards compatibility during the
 * pinless cutover. All access checks are now identity-based via Clerk
 * and `userAccess`.
 */
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
  getCurrentUserAccess,
  requireCoachForMatch,
  requireRefereeForMatch,
} from "./lib/userAccess";

type ReaderCtx = QueryCtx | MutationCtx;

export async function verifyCoachTeamMembership(
  ctx: ReaderCtx,
  match: Doc<"matches">,
  _pin?: string,
): Promise<Doc<"coaches"> | null> {
  try {
    return await requireCoachForMatch(ctx, match);
  } catch {
    return null;
  }
}

export async function verifyClockPin(
  ctx: ReaderCtx,
  match: Doc<"matches">,
  _pin?: string,
  _referee?: Doc<"referees"> | null,
): Promise<boolean> {
  const access = await getCurrentUserAccess(ctx);
  if (!access) return false;

  if (access.roles.includes("referee")) {
    try {
      await requireRefereeForMatch(ctx, match);
      return true;
    } catch {
      // Fall through to coach permissions.
    }
  }

  if (!access.roles.includes("coach")) {
    return false;
  }

  const coach = await verifyCoachTeamMembership(ctx, match);
  if (!coach) return false;

  if (match.refereeId) {
    return true;
  }

  return match.leadCoachId === coach._id;
}

export async function verifyIsMatchLead(
  ctx: ReaderCtx,
  match: Doc<"matches">,
  _pin?: string,
): Promise<Doc<"coaches"> | null> {
  const coach = await verifyCoachTeamMembership(ctx, match);
  if (!coach || match.leadCoachId !== coach._id) {
    return null;
  }
  return coach;
}
