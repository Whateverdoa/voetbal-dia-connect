import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdminAccess } from "./adminAuth";
import {
  AccessRole,
  deactivateUserAccess,
  getBootstrapAdminEmails,
  getUserAccessByEmail,
  upsertUserAccess,
} from "./lib/userAccess";

function collectRoles(existingRoles: AccessRole[], role: AccessRole) {
  return Array.from(new Set([...existingRoles, role])).sort() as AccessRole[];
}

export const listUserAccess = query({
  handler: async (ctx) => {
    await requireAdminAccess(ctx);
    return await ctx.db.query("userAccess").collect();
  },
});

export const backfillUserAccess = mutation({
  handler: async (ctx) => {
    await requireAdminAccess(ctx);

    let createdOrUpdated = 0;

    for (const email of getBootstrapAdminEmails()) {
      await upsertUserAccess(ctx, {
        email,
        roles: ["admin"],
        source: "bootstrap_admin",
      });
      createdOrUpdated += 1;
    }

    const coaches = await ctx.db.query("coaches").collect();
    for (const coach of coaches) {
      if (!coach.email) continue;
      const existing = await getUserAccessByEmail(ctx, coach.email);
      const roles = collectRoles(existing?.roles ?? [], "coach");
      await upsertUserAccess(ctx, {
        email: coach.email,
        roles,
        coachId: coach._id,
        refereeId: existing?.refereeId,
        active: existing?.active ?? true,
        source: "migration_backfill",
      });
      createdOrUpdated += 1;
    }

    const referees = await ctx.db.query("referees").collect();
    for (const referee of referees) {
      if (!referee.email) continue;
      const existing = await getUserAccessByEmail(ctx, referee.email);
      const roles = collectRoles(existing?.roles ?? [], "referee");
      await upsertUserAccess(ctx, {
        email: referee.email,
        roles,
        coachId: existing?.coachId,
        refereeId: referee._id,
        active: existing?.active ?? referee.active,
        source: "migration_backfill",
      });
      createdOrUpdated += 1;
    }

    const matches = await ctx.db.query("matches").collect();
    let matchedMatches = 0;
    for (const match of matches) {
      if (match.coachId) continue;
      if (!match.coachPin) continue;

      const coach = await ctx.db
        .query("coaches")
        .withIndex("by_pin", (q) => q.eq("pin", match.coachPin!))
        .first();
      if (!coach) continue;

      await ctx.db.patch(match._id, { coachId: coach._id });
      matchedMatches += 1;
    }

    return { createdOrUpdated, matchedMatches };
  },
});

export const deactivateUserAccessByEmail = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    await deactivateUserAccess(ctx, args.email);
    return { success: true };
  },
});

export const grantAdminAccess = internalMutation({
  args: {
    email: v.string(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await getUserAccessByEmail(ctx, args.email);
    const roles = collectRoles(existing?.roles ?? [], "admin");
    const accessId = await upsertUserAccess(ctx, {
      email: args.email,
      roles,
      coachId: existing?.coachId,
      refereeId: existing?.refereeId,
      active: true,
      source: "recovery",
    });

    return {
      accessId,
      email: args.email.trim().toLowerCase(),
      reason: args.reason.trim(),
    };
  },
});
