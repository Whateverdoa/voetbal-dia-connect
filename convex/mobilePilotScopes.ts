import { makeFunctionReference } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const expireReference = makeFunctionReference<"mutation", { scopeId: Id<"mobilePilotScopes">; expiresAt: number }, null>("mobilePilotScopes:expire");

// Operator-only; there is deliberately no public grant or role-sync mutation.
export const configure = internalMutation({
  args: { subject: v.string(), matchId: v.id("matches"), teamId: v.id("teams"), enabled: v.boolean(), expiresAt: v.number() },
  returns: v.id("mobilePilotScopes"),
  handler: async (ctx, args) => {
    const now = Date.now();
    if (!args.subject.trim() || args.subject.length > 200 || !Number.isFinite(args.expiresAt) ||
        (args.enabled && (args.expiresAt <= now || args.expiresAt > now + 7 * 24 * 60 * 60_000))) {
      throw new ConvexError("VALIDATION_ERROR");
    }
    const match = await ctx.db.get(args.matchId);
    if (!match || match.teamId !== args.teamId) throw new ConvexError("PILOT_ACCESS_DENIED");
    const previous = await ctx.db.query("mobilePilotScopes")
      .withIndex("by_subject_and_match", q => q.eq("subject", args.subject).eq("matchId", args.matchId)).unique();
    const scopeId = previous?._id ?? await ctx.db.insert("mobilePilotScopes", { ...args, updatedAt: now });
    if (previous) await ctx.db.patch(scopeId, { ...args, updatedAt: now });
    if (args.enabled) await ctx.scheduler.runAt(args.expiresAt, expireReference, { scopeId, expiresAt: args.expiresAt });
    return scopeId;
  },
});

export const expire = internalMutation({
  args: { scopeId: v.id("mobilePilotScopes"), expiresAt: v.number() }, returns: v.null(),
  handler: async (ctx, args) => {
    const scope = await ctx.db.get(args.scopeId);
    if (scope?.enabled && scope.expiresAt === args.expiresAt && Date.now() >= scope.expiresAt) {
      // Invalidates live query subscriptions as well as denying future requests.
      await ctx.db.patch(scope._id, { enabled: false, updatedAt: Date.now() });
    }
    return null;
  },
});
