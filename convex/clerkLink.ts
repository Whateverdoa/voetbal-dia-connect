/**
 * Server-only link data for Clerk: coach by email.
 * Used by Next.js server (with CONVEX_LINK_SECRET) to link Clerk user → coach without PIN.
 * Set in Convex dashboard: npx convex env set CONVEX_LINK_SECRET <secret>
 */
import { query } from "./_generated/server";
import { v } from "convex/values";

const LINK_SECRET = process.env.CONVEX_LINK_SECRET ?? "";

export const getCoachByEmailForLink = query({
  args: {
    email: v.string(),
    linkSecret: v.string(),
  },
  handler: async (ctx, args) => {
    if (!LINK_SECRET || args.linkSecret !== LINK_SECRET) {
      return null;
    }
    const emailLower = args.email.trim().toLowerCase();
    if (!emailLower) return null;

    const coach = await ctx.db
      .query("coaches")
      .withIndex("by_email", (q) => q.eq("email", emailLower))
      .first();

    if (!coach) return null;

    return {
      coachId: coach._id,
      coachName: coach.name,
      teamIds: coach.teamIds,
      pin: coach.pin,
    };
  },
});
