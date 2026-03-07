/**
 * Admin operations for coaches
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdminAccess } from "./adminAuth";

// ============ COACHES ============

export const createCoach = mutation({
  args: {
    name: v.string(),
    pin: v.string(),
    teamIds: v.array(v.id("teams")),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);

    const existing = await ctx.db
      .query("coaches")
      .withIndex("by_pin", (q) => q.eq("pin", args.pin))
      .first();
    if (existing) throw new Error("PIN already in use");

    const emailNorm = args.email?.trim().toLowerCase();
    if (emailNorm) {
      const byEmail = await ctx.db
        .query("coaches")
        .withIndex("by_email", (q) => q.eq("email", emailNorm))
        .first();
      if (byEmail) throw new Error("E-mail al gekoppeld aan een andere coach");
    }

    return await ctx.db.insert("coaches", {
      name: args.name,
      pin: args.pin,
      teamIds: args.teamIds,
      email: emailNorm ?? undefined,
      createdAt: Date.now(),
    });
  },
});

export const listCoaches = query({
  handler: async (ctx) => {
    const coaches = await ctx.db.query("coaches").collect();
    
    // Enrich with team names
    return await Promise.all(
      coaches.map(async (c) => {
        const teams = await Promise.all(c.teamIds.map((id) => ctx.db.get(id)));
        return {
          ...c,
          teams: teams.filter(Boolean).map((t) => ({ id: t!._id, name: t!.name })),
        };
      })
    );
  },
});

export const updateCoach = mutation({
  args: {
    coachId: v.id("coaches"),
    name: v.optional(v.string()),
    pin: v.optional(v.string()),
    teamIds: v.optional(v.array(v.id("teams"))),
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);

    const { coachId, ...updates } = args;

    if (updates.pin) {
      const existing = await ctx.db
        .query("coaches")
        .withIndex("by_pin", (q) => q.eq("pin", updates.pin!))
        .first();
      if (existing && existing._id !== coachId) throw new Error("PIN already in use");
    }

    const emailNorm = updates.email !== undefined
      ? (updates.email?.trim().toLowerCase() || undefined)
      : undefined;
    if (emailNorm !== undefined && emailNorm) {
      const byEmail = await ctx.db
        .query("coaches")
        .withIndex("by_email", (q) => q.eq("email", emailNorm))
        .first();
      if (byEmail && byEmail._id !== coachId) throw new Error("E-mail al gekoppeld aan een andere coach");
    }

    const filtered: Record<string, unknown> = {};
    if (updates.name !== undefined) filtered.name = updates.name;
    if (updates.pin !== undefined) filtered.pin = updates.pin;
    if (updates.teamIds !== undefined) filtered.teamIds = updates.teamIds;
    if (updates.email !== undefined) filtered.email = emailNorm;
    await ctx.db.patch(coachId, filtered);
  },
});

export const deleteCoach = mutation({
  args: { 
    coachId: v.id("coaches"),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    await ctx.db.delete(args.coachId);
  },
});
