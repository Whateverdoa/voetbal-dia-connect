import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { enforceRefereeClock } from "./lib/refereeMatchPolicy";

// No public activation or migration: the command/web integration must pass first.
export const guardClock = internalMutation({
  args: { matchId: v.id("matches"), generation: v.number() }, returns: v.null(),
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match?.refereePolicy || match.refereePolicy.generation !== args.generation) return null;
    await enforceRefereeClock(ctx, match, Date.now());
    return null;
  },
});
