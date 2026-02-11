/**
 * Referee assignment mutations.
 *
 * Split from matchActions.ts to respect the 300-LOC rule.
 * Re-exported via matchActions for a single public API surface.
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { verifyCoachPin } from "./pinHelpers";

/** Assign or unassign a referee to a match (coach-only) */
export const assignReferee = mutation({
  args: {
    matchId: v.id("matches"),
    pin: v.string(), // Coach PIN for auth
    refereeId: v.optional(v.id("referees")),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match || !verifyCoachPin(match, args.pin)) {
      throw new Error("Invalid match or PIN");
    }

    if (args.refereeId) {
      const referee = await ctx.db.get(args.refereeId);
      if (!referee) {
        throw new Error("Scheidsrechter niet gevonden");
      }
      if (!referee.active) {
        throw new Error("Scheidsrechter is niet actief");
      }
      await ctx.db.patch(args.matchId, { refereeId: args.refereeId });
    } else {
      await ctx.db.patch(args.matchId, { refereeId: undefined });
    }
  },
});
