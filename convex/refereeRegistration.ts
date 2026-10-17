import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { officialDutyEligibility, pilotIdentity } from "./lib/mobilePilotAccess";
import { readRefereeDetail, readRefereeTimeline, refereeDetailValidator, timelineEvent } from "./lib/refereeMatchRead";
import { refereeCommandArgs, refereeCommandResult } from "./lib/refereeRegistrationContract";
import { executeRefereeRegistration } from "./lib/refereeRegistration";

async function webAccess(ctx: QueryCtx | MutationCtx, matchId: Id<"matches">) {
  const { access, subject } = await pilotIdentity(ctx);
  const match = await ctx.db.get(matchId);
  if (match?.refereePolicy?.version !== 1) return null;
  const team = await ctx.db.get(match.teamId);
  if (!team || team.active === false) throw new ConvexError("FORBIDDEN");
  const duty = await officialDutyEligibility(ctx, match, access);
  if (!duty.canRead) throw new ConvexError("FORBIDDEN");
  return { subject, match, team, ...duty };
}
function webWritesEnabled() { return process.env.WEB_REFEREE_PILOT_WRITES_ENABLED === "true"; }
// Read-only eligibility inspection must not require activating a match policy or scope.
// It reveals only the authenticated actor's rights for an already readable match.
export const diagnose = query({
  args: { matchId: v.id("matches") },
  returns: v.object({
    diagnosticVersion: v.literal(1), readOnly: v.literal(true),
    actorSubject: v.string(), matchId: v.id("matches"),
    controller: v.union(v.literal("referee"), v.literal("coach"), v.literal("none")),
    isOfficialRegistrar: v.boolean(), eligibleToControl: v.boolean(), policyActive: v.boolean(),
    mobileScopeStatus: v.union(v.literal("missing"), v.literal("disabled"), v.literal("expired"), v.literal("team_mismatch"), v.literal("ready")),
  }),
  handler: async (ctx, args) => {
    const { access, subject } = await pilotIdentity(ctx);
    const match = await ctx.db.get(args.matchId);
    if (!match) throw new ConvexError("NOT_FOUND");
    const duty = await officialDutyEligibility(ctx, match, access);
    if (!duty.canRead) throw new ConvexError("FORBIDDEN");
    const team = await ctx.db.get(match.teamId);
    if (!team || team.active === false) throw new ConvexError("FORBIDDEN");
    const scope = await ctx.db.query("mobilePilotScopes")
      .withIndex("by_subject_and_match", q => q.eq("subject", subject).eq("matchId", match._id)).unique();
    const mobileScopeStatus: "missing" | "disabled" | "expired" | "team_mismatch" | "ready" = !scope ? "missing" : !scope.enabled ? "disabled" : scope.teamId !== match.teamId ? "team_mismatch"
      : scope.expiresAt <= Date.now() ? "expired" : "ready";
    return { diagnosticVersion: 1 as const, readOnly: true as const,
      actorSubject: subject, matchId: match._id, controller: duty.controller,
      isOfficialRegistrar: duty.isOfficialRegistrar, eligibleToControl: duty.eligibleToControl,
      policyActive: match.refereePolicy?.version === 1, mobileScopeStatus };
  },
});

export const getMatch = query({
  args: { matchId: v.id("matches") }, returns: v.union(v.null(), refereeDetailValidator),
  handler: async (ctx, args) => {
    const rights = await webAccess(ctx, args.matchId);
    return rights ? await readRefereeDetail(ctx, rights, webWritesEnabled(), 0) : null;
  },
});
export const timeline = query({
  args: { matchId: v.id("matches"), paginationOpts: paginationOptsValidator }, returns: paginationResultValidator(timelineEvent),
  handler: async (ctx, args) => {
    const rights = await webAccess(ctx, args.matchId);
    if (!rights) throw new ConvexError("PILOT_POLICY_REQUIRED");
    return await readRefereeTimeline(ctx, rights, args.paginationOpts);
  },
});
export const command = mutation({
  args: refereeCommandArgs, returns: refereeCommandResult,
  handler: async (ctx, args) => {
    // Explicit transport-level gates, in addition to the shared core's checks.
    const rights = await webAccess(ctx, args.matchId);
    if (!rights || rights.match.refereePolicy?.version !== 1) throw new ConvexError("PILOT_POLICY_REQUIRED");
    if (!webWritesEnabled()) throw new ConvexError("WEB_PILOT_WRITES_DISABLED");
    if (!rights.isOfficialRegistrar || rights.match.cancelledAt !== undefined) throw new ConvexError("OFFICIAL_REGISTRATOR_REQUIRED");
    return await executeRefereeRegistration(ctx, args);
  },
});
