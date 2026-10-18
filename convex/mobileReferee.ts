import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { trialAccess } from "./lib/singleMatchTrial";
import { mobilePilotWritesAllowed } from "./lib/mobilePilotWrites";
import { refereeCommandArgs, refereeCommandResult } from "./lib/refereeRegistrationContract";
import { executeRefereeRegistration } from "./lib/refereeRegistration";
import { compatibility, matchFields, matchSummary, refereeDetailValidator, readRefereeDetail, timelineEvent, readRefereeTimeline } from "./lib/refereeMatchRead";

export const session = query({
  args: {}, returns: v.object({ ...compatibility, subject: v.string(), expiresAt: v.number() }),
  handler: async ctx => {
    const rights = await trialAccess(ctx);
    return { apiVersion: 1 as const, clockPolicyVersion: rights.match.refereePolicy ? 1 as const : 0 as const,
      writesEnabled: mobilePilotWritesAllowed(rights.scope, rights.match) && rights.eligibleToControl,
      subject: rights.subject, expiresAt: rights.scope.expiresAt };
  },
});
export const listMatches = query({
  args: {}, returns: v.object({ ...compatibility, matches: v.array(v.object(matchFields)) }),
  handler: async ctx => {
    const rights = await trialAccess(ctx);
    const enabled = mobilePilotWritesAllowed(rights.scope, rights.match);
    return { apiVersion: 1 as const, clockPolicyVersion: rights.match.refereePolicy ? 1 as const : 0 as const,
      writesEnabled: enabled && rights.eligibleToControl,
      matches: [matchSummary(rights, enabled, rights.scope.expiresAt)] };
  },
});
export const getMatch = query({
  args: { matchId: v.id("matches") }, returns: refereeDetailValidator,
  handler: async (ctx, args) => {
    const rights = await trialAccess(ctx, args.matchId);
    return await readRefereeDetail(ctx, rights, mobilePilotWritesAllowed(rights.scope, rights.match), rights.scope.expiresAt);
  },
});
export const command = mutation({
  args: refereeCommandArgs, returns: refereeCommandResult,
  handler: async (ctx, args) => {
    const rights = await trialAccess(ctx, args.matchId);
    if (!mobilePilotWritesAllowed(rights.scope, rights.match)) throw new ConvexError("PILOT_WRITES_DISABLED");
    return await executeRefereeRegistration(ctx, args);
  },
});
export const timeline = query({
  args: { matchId: v.id("matches"), paginationOpts: paginationOptsValidator }, returns: paginationResultValidator(timelineEvent),
  handler: async (ctx, args) => readRefereeTimeline(ctx, await trialAccess(ctx, args.matchId), args.paginationOpts),
});
