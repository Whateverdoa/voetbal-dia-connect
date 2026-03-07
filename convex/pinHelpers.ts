/**
 * PIN verification helpers shared across clock and match mutations.
 *
 * Coach access is now based on **team membership**: any coach whose
 * `teamIds` includes the match's `teamId` is authorised.  The old
 * single-owner `match.coachPin === pin` check is replaced everywhere.
 */
import { Doc } from "./_generated/dataModel";
import { GenericDatabaseReader, UserIdentity } from "convex/server";
import { DataModel } from "./_generated/dataModel";

type DbReader = GenericDatabaseReader<DataModel>;

/**
 * Verify that the given PIN belongs to a coach who is assigned to
 * the same team as the match.
 *
 * Returns the coach document on success, or `null` on failure.
 */
export async function verifyCoachTeamMembership(
  ctx: {
    db: DbReader;
    auth?: { getUserIdentity: () => Promise<UserIdentity | null> };
  },
  match: Doc<"matches">,
  pin?: string,
): Promise<Doc<"coaches"> | null> {
  // Preferred path: authenticated user email → coach record
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

  // Legacy fallback path: PIN
  if (!pin) return null;
  const normalizedPin = pin.trim();
  if (!normalizedPin) return null;
  const byPin = await ctx.db
    .query("coaches")
    .withIndex("by_pin", (q) => q.eq("pin", normalizedPin))
    .first();
  if (!byPin) return null;
  if (!byPin.teamIds.includes(match.teamId)) return null;
  return byPin;
}

/**
 * Verify coach access for a team outside of an existing match context.
 * Identity email is preferred; PIN remains as fallback.
 */
export async function verifyCoachTeamByTeamId(
  ctx: {
    db: DbReader;
    auth?: { getUserIdentity: () => Promise<UserIdentity | null> };
  },
  teamId: Doc<"teams">["_id"],
  pin?: string,
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

  if (!pin) return null;
  const normalizedPin = pin.trim();
  if (!normalizedPin) return null;
  const byPin = await ctx.db
    .query("coaches")
    .withIndex("by_pin", (q) => q.eq("pin", normalizedPin))
    .first();
  if (!byPin) return null;
  if (!byPin.teamIds.includes(teamId)) return null;
  return byPin;
}

/**
 * Verify that the given PIN is valid for clock/match-control actions.
 * Referee-first: when a referee is assigned, referee keeps full access.
 * When no referee is assigned, only the lead coach may control the clock.
 */
export async function verifyClockPin(
  ctx: {
    db: DbReader;
    auth?: { getUserIdentity: () => Promise<UserIdentity | null> };
  },
  match: Doc<"matches">,
  pin?: string,
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

  // Referee PIN: always allow when match has this referee assigned
  const normalizedPin = pin?.trim();
  if (normalizedPin && referee && match.refereeId && referee._id === match.refereeId) {
    if (referee.pin === normalizedPin) return true;
  }

  // Coach: require team membership (identity-first, PIN fallback)
  const coach = await verifyCoachTeamMembership(ctx, match, normalizedPin);
  if (!coach) return false;

  // Any team coach may control the clock.
  // Referee assignment still grants referee access, but no longer restricts coaches.
  if (match.refereeId) return true;
  return !!coach;
}

/**
 * Verify that the given PIN belongs to the match lead (wedstrijdleider).
 * Returns the coach doc if they are the lead, null otherwise.
 */
export async function verifyIsMatchLead(
  ctx: {
    db: DbReader;
    auth?: { getUserIdentity: () => Promise<UserIdentity | null> };
  },
  match: Doc<"matches">,
  pin?: string,
): Promise<Doc<"coaches"> | null> {
  const coach = await verifyCoachTeamMembership(ctx, match, pin);
  if (!coach || match.leadCoachId !== coach._id) return null;
  return coach;
}
