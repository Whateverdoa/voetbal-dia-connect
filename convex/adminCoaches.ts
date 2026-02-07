/**
 * Admin operations for coaches
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { verifyAdminPin } from "./adminAuth";

// ============ COACHES ============

export const createCoach = mutation({
  args: {
    name: v.string(),
    pin: v.string(),
    teamIds: v.array(v.id("teams")),
    adminPin: v.string(),
  },
  handler: async (ctx, args) => {
    verifyAdminPin(args.adminPin);
    
    // Check PIN is unique
    const existing = await ctx.db
      .query("coaches")
      .withIndex("by_pin", (q) => q.eq("pin", args.pin))
      .first();
    
    if (existing) {
      throw new Error("PIN already in use");
    }

    return await ctx.db.insert("coaches", {
      name: args.name,
      pin: args.pin,
      teamIds: args.teamIds,
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
    adminPin: v.string(),
  },
  handler: async (ctx, args) => {
    verifyAdminPin(args.adminPin);
    
    const { coachId, adminPin: _, ...updates } = args;
    
    // Check PIN uniqueness if changing
    if (updates.pin) {
      const existing = await ctx.db
        .query("coaches")
        .withIndex("by_pin", (q) => q.eq("pin", updates.pin!))
        .first();
      if (existing && existing._id !== coachId) {
        throw new Error("PIN already in use");
      }
    }
    
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(coachId, filtered);
  },
});

export const deleteCoach = mutation({
  args: { 
    coachId: v.id("coaches"),
    adminPin: v.string(),
  },
  handler: async (ctx, args) => {
    verifyAdminPin(args.adminPin);
    await ctx.db.delete(args.coachId);
  },
});
