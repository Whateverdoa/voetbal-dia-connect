/**
 * Match lead (wedstrijdleider) mutations
 *
 * A coach can claim the "match lead" role for a specific match.
 * Only one coach can be lead at a time per match.
 */
import { mutation } from "./_generated/server";
import { v } from "convex/values";

// PHASE 2: Uncomment to enforce lead-only permissions
// import { Doc, Id } from "./_generated/dataModel";
// function isMatchLead(match: Doc<"matches">, coachId: Id<"coaches">): boolean {
//   return match.leadCoachId === coachId;
// }

/** Claim the match lead role for a match */
export const claimMatchLead = mutation({
  args: {
    matchId: v.id("matches"),
    pin: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Look up coach by PIN
    const coach = await ctx.db
      .query("coaches")
      .withIndex("by_pin", (q) => q.eq("pin", args.pin))
      .first();
    if (!coach) {
      throw new Error("Ongeldige PIN");
    }

    // 2. Verify match exists and coach belongs to the match's team
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }
    if (!coach.teamIds.includes(match.teamId)) {
      throw new Error("Coach is niet gekoppeld aan dit team");
    }

    // 3. Check if another coach already claimed lead
    if (match.leadCoachId && match.leadCoachId !== coach._id) {
      throw new Error("Er is al een wedstrijdleider voor deze wedstrijd");
    }

    // 4. Set this coach as match lead
    await ctx.db.patch(args.matchId, {
      leadCoachId: coach._id,
    });

    // 5. Return success
    return { success: true, coachName: coach.name };
  },
});

/** Release the match lead role */
export const releaseMatchLead = mutation({
  args: {
    matchId: v.id("matches"),
    pin: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Look up coach by PIN
    const coach = await ctx.db
      .query("coaches")
      .withIndex("by_pin", (q) => q.eq("pin", args.pin))
      .first();
    if (!coach) {
      throw new Error("Ongeldige PIN");
    }

    // 2. Verify match exists and coach belongs to the match's team
    const match = await ctx.db.get(args.matchId);
    if (!match) {
      throw new Error("Wedstrijd niet gevonden");
    }
    if (!coach.teamIds.includes(match.teamId)) {
      throw new Error("Coach is niet gekoppeld aan dit team");
    }

    // 3. Check that this coach is the current lead
    if (match.leadCoachId !== coach._id) {
      throw new Error("Jij bent niet de wedstrijdleider");
    }

    // 4. Clear the match lead
    await ctx.db.patch(args.matchId, {
      leadCoachId: undefined,
    });
  },
});
