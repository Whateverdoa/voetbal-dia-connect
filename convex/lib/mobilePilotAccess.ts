import { ConvexError } from "convex/values";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { getCurrentUserAccess, type RuntimeUserAccess } from "./userAccess";

type Reader = QueryCtx | MutationCtx;
export const MAX_PILOT_MATCHES = 100;

export async function pilotIdentity(ctx: Reader) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError("UNAUTHENTICATED");
  // Never resolve access from arbitrary email-like custom claim values.
  if (!identity.subject || typeof identity.email !== "string" ||
      (identity.emailVerified !== true && identity.email_verified !== true)) {
    throw new ConvexError("AUTH_IDENTITY_INCOMPLETE");
  }
  const access = await getCurrentUserAccess(ctx);
  if (!access?.active) throw new ConvexError("FORBIDDEN");
  return { subject: identity.subject, access };
}

export async function officialDutyEligibility(ctx: Reader, match: Doc<"matches">, access: RuntimeUserAccess) {
  const referee = match.refereeId ? await ctx.db.get(match.refereeId) : null;
  const coach = access.roles.includes("coach") && access.coachId
    ? await ctx.db.get(access.coachId) : null;
  const ownCoach = !!coach && coach.teamIds.includes(match.teamId);
  const assignedReferee = !!referee?.active && access.roles.includes("referee") &&
    access.refereeId === referee._id;
  const eligible = match.refereeId ? assignedReferee : ownCoach && match.leadCoachId === coach?._id;
  return {
    canRead: access.roles.includes("admin") || assignedReferee || ownCoach,
    eligibleToControl: !!eligible && !match.cancelledAt && match.status !== "finished",
    controller: match.refereeId ? "referee" as const : match.leadCoachId ? "coach" as const : "none" as const,
  };
}

export async function pilotMatchAccess(ctx: Reader, matchId: Id<"matches">) {
  const actor = await pilotIdentity(ctx);
  const scope = await ctx.db.query("mobilePilotScopes")
    .withIndex("by_subject_and_match", q => q.eq("subject", actor.subject).eq("matchId", matchId)).unique();
  if (!scope?.enabled || scope.expiresAt <= Date.now()) throw new ConvexError("PILOT_ACCESS_DENIED");
  const match = await ctx.db.get(matchId);
  if (!match || match.teamId !== scope.teamId) throw new ConvexError("PILOT_ACCESS_DENIED");
  const team = await ctx.db.get(match.teamId);
  if (!team || team.active === false) throw new ConvexError("PILOT_ACCESS_DENIED");
  const duty = await officialDutyEligibility(ctx, match, actor.access);
  if (!duty.canRead) throw new ConvexError("FORBIDDEN");
  return { ...actor, ...duty, scope, match, team };
}

export async function listPilotMatches(ctx: Reader) {
  const actor = await pilotIdentity(ctx);
  const scopes = await ctx.db.query("mobilePilotScopes")
    .withIndex("by_subject", q => q.eq("subject", actor.subject)).take(MAX_PILOT_MATCHES + 1);
  if (scopes.length > MAX_PILOT_MATCHES) throw new ConvexError("RESOURCE_LIMIT");
  const active = scopes.filter(scope => scope.enabled && scope.expiresAt > Date.now());
  const result: Awaited<ReturnType<typeof pilotMatchAccess>>[] = [];
  for (const scope of active) {
    // A revoked role must deny a previously approved scope, not resurrect access.
    result.push(await pilotMatchAccess(ctx, scope.matchId));
  }
  if (!result.length) throw new ConvexError("PILOT_ACCESS_DENIED");
  return result;
}
