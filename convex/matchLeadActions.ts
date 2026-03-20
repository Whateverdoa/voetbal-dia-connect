/**
 * Match lead (wedstrijdleider) mutations
 *
 * A coach can claim the "match lead" role for a specific match.
 * Only one coach can be lead at a time per match.
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { verifyCoachTeamMembership, verifyIsMatchLead } from "./pinHelpers";

// PHASE 2: Uncomment to enforce lead-only permissions
// import { Doc, Id } from "./_generated/dataModel";
// function isMatchLead(match: Doc<"matches">, coachId: Id<"coaches">): boolean {
//   return match.leadCoachId === coachId;
// }

/** Claim the match lead role for a match */
export const claimMatchLead = mutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }
    const coach = await verifyCoachTeamMembership(ctx, match);
    if (!coach) throw new Error("Geen toegang tot deze wedstrijd");

    if (match.leadCoachId && match.leadCoachId !== coach._id) {
      throw new Error("Er is al een wedstrijdleider voor deze wedstrijd");
    }

    await ctx.db.patch(args.matchId, {
      leadCoachId: coach._id,
    });

    return { success: true, coachName: coach.name };
  },
});

/** Release the match lead role */
export const releaseMatchLead = mutation({
  args: {
    matchId: v.id("matches"),
  },
  handler: async (ctx, args) => {
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }
    const coach = await verifyIsMatchLead(ctx, match);
    if (!coach) {
      throw new Error("Jij bent niet de wedstrijdleider");
    }

    await ctx.db.patch(args.matchId, {
      leadCoachId: undefined,
    });
  },
});
