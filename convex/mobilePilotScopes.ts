import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

// Expiry only. Trial grants must go through the pinned, 24-hour activation gate.
export const expire = internalMutation({
  args: { scopeId: v.id("mobilePilotScopes"), expiresAt: v.number() }, returns: v.null(),
  handler: async (ctx, args) => {
    const scope = await ctx.db.get(args.scopeId);
    if (scope?.enabled && scope.expiresAt === args.expiresAt && Date.now() >= scope.expiresAt) {
      await ctx.db.patch(scope._id, { enabled: false, updatedAt: Date.now() });
    }
    return null;
  },
});
