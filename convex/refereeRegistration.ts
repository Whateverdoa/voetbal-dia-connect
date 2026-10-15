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
