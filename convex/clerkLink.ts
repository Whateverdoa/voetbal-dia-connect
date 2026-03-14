/**
 * Server-only link data for Clerk: coach by email.
 * Used by Next.js server (with CONVEX_LINK_SECRET) to link Clerk user → coach by e-mail.
 * Set in Convex dashboard: npx convex env set CONVEX_LINK_SECRET <secret>
 */
import { query } from "./_generated/server";
import { mutation } from "./_generated/server";
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
    };
  },
});

export const assignEmailRoleLinksForOps = mutation({
  args: {
    email: v.string(),
    linkSecret: v.string(),
    coachName: v.optional(v.string()),
    refereeName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!LINK_SECRET || args.linkSecret !== LINK_SECRET) {
      throw new Error("Unauthorized");
    }

    const emailLower = args.email.trim().toLowerCase();
    if (!emailLower) {
      throw new Error("Email is verplicht");
    }

    const coachName = args.coachName?.trim();
    const refereeName = args.refereeName?.trim() || coachName || "Referee";

    let coach = await ctx.db
      .query("coaches")
      .withIndex("by_email", (q) => q.eq("email", emailLower))
      .first();

    if (!coach && coachName) {
      const allCoaches = await ctx.db.query("coaches").collect();
      coach = allCoaches.find((c) => c.name.toLowerCase() === coachName.toLowerCase()) ?? null;
    }

    if (!coach) {
      throw new Error("Coach niet gevonden, geef coachName mee.");
    }

    if (coach.email !== emailLower) {
      await ctx.db.patch(coach._id, { email: emailLower });
    }

    let referee = await ctx.db
      .query("referees")
      .withIndex("by_email", (q) => q.eq("email", emailLower))
      .first();

    if (!referee) {
      const allReferees = await ctx.db.query("referees").collect();
      referee =
        allReferees.find((r) => r.name.toLowerCase() === refereeName.toLowerCase()) ?? null;
    }

    if (referee) {
      const patch: { email?: string; active?: boolean } = {};
      if (referee.email !== emailLower) patch.email = emailLower;
      if (!referee.active) patch.active = true;
      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(referee._id, patch);
      }
    } else {
      const refereeId = await ctx.db.insert("referees", {
        name: refereeName,
        email: emailLower,
        active: true,
        createdAt: Date.now(),
      });
      referee = await ctx.db.get(refereeId);
    }

    return {
      email: emailLower,
      coach: { id: coach._id, name: coach.name, teamIds: coach.teamIds },
      referee: referee
        ? { id: referee._id, name: referee.name, active: referee.active }
        : null,
    };
  },
});
