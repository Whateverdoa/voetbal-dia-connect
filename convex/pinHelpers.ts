/**
 * Access verification helpers shared across clock and match mutations.
 *
 * Coach/referee access is identity-based (Clerk email) only.
 */
import { Doc } from "./_generated/dataModel";
import { GenericDatabaseReader, UserIdentity } from "convex/server";
import { DataModel } from "./_generated/dataModel";

type DbReader = GenericDatabaseReader<DataModel>;

/**
 * Returns the coach document on success, or `null` on failure.
 */
export async function verifyCoachTeamMembership(
  ctx: {
    db: DbReader;
    auth?: { getUserIdentity: () => Promise<UserIdentity | null> };
  },
  match: Doc<"matches">,
): Promise<Doc<"coaches"> | null> {
  const identity = await ctx.auth?.getUserIdentity?.();
  const identityEmail = identity?.email?.toLowerCase();
  if (identityEmail) {
    const byEmail = await ctx.db
      .query("coaches")
      .withIndex("by_email", (q) => q.eq("email", identityEmail))
      .first();
    if (byEmail && byEmail.teamIds.includes(match.teamId)) {
      return byEmail;
    }
  }
  return null;
}

/**
 * Verify coach access for a team outside of an existing match context.
 * Identity email only.
 */
export async function verifyCoachTeamByTeamId(
  ctx: {
    db: DbReader;
    auth?: { getUserIdentity: () => Promise<UserIdentity | null> };
  },
  teamId: Doc<"teams">["_id"],
): Promise<Doc<"coaches"> | null> {
  const identity = await ctx.auth?.getUserIdentity?.();
  const identityEmail = identity?.email?.toLowerCase();
  if (identityEmail) {
    const byEmail = await ctx.db
      .query("coaches")
      .withIndex("by_email", (q) => q.eq("email", identityEmail))
      .first();
    if (byEmail && byEmail.teamIds.includes(teamId)) {
      return byEmail;
    }
  }
  return null;
}

/**
 * Verify identity-based access for clock/match-control actions.
 */
export async function verifyClockAccess(
  ctx: {
    db: DbReader;
    auth?: { getUserIdentity: () => Promise<UserIdentity | null> };
  },
  match: Doc<"matches">,
  referee?: Doc<"referees"> | null,
): Promise<boolean> {
  const identity = await ctx.auth?.getUserIdentity?.();
  const identityEmail = identity?.email?.toLowerCase();

  // Identity-first for assigned referee
  if (identityEmail && match.refereeId) {
    const byEmail = await ctx.db
      .query("referees")
      .withIndex("by_email", (q) => q.eq("email", identityEmail))
      .first();
    if (byEmail && byEmail.active && byEmail._id === match.refereeId) {
      return true;
    }
  }

  // Coach: require team membership by identity
  const coach = await verifyCoachTeamMembership(ctx, match);
  if (!coach) return false;

  // Any team coach may control the clock.
  // Referee assignment still grants referee access, but no longer restricts coaches.
  if (match.refereeId) return true;
  return !!coach;
}

/**
 * Verify that the current coach is the match lead (wedstrijdleider).
 * Returns the coach doc if they are the lead, null otherwise.
 */
export async function verifyIsMatchLead(
  ctx: {
    db: DbReader;
    auth?: { getUserIdentity: () => Promise<UserIdentity | null> };
  },
  match: Doc<"matches">,
): Promise<Doc<"coaches"> | null> {
  const coach = await verifyCoachTeamMembership(ctx, match);
  if (!coach || match.leadCoachId !== coach._id) return null;
  return coach;
}
