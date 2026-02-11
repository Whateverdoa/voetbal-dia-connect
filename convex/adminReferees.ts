/**
 * Admin operations for referees
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { verifyAdminPin } from "./adminAuth";

export const createReferee = mutation({
  args: {
    name: v.string(),
    pin: v.string(),
    adminPin: v.string(),
  },
  handler: async (ctx, args) => {
    verifyAdminPin(args.adminPin);

    const trimmedName = args.name.trim();
    if (!trimmedName) {
      throw new Error("Naam is verplicht");
    }

    const trimmedPin = args.pin.trim();
    if (trimmedPin.length < 4 || trimmedPin.length > 6) {
      throw new Error("PIN moet 4-6 tekens zijn");
    }

    // Check PIN uniqueness across referees AND coaches
    const existingReferee = await ctx.db
      .query("referees")
      .withIndex("by_pin", (q) => q.eq("pin", trimmedPin))
      .first();
    if (existingReferee) {
      throw new Error("PIN is al in gebruik door een scheidsrechter");
    }

    const existingCoach = await ctx.db
      .query("coaches")
      .withIndex("by_pin", (q) => q.eq("pin", trimmedPin))
      .first();
    if (existingCoach) {
      throw new Error("PIN is al in gebruik door een coach");
    }

    return await ctx.db.insert("referees", {
      name: trimmedName,
      pin: trimmedPin,
      active: true,
      createdAt: Date.now(),
    });
  },
});

export const listReferees = query({
  handler: async (ctx) => {
    return await ctx.db.query("referees").collect();
  },
});

export const updateReferee = mutation({
  args: {
    refereeId: v.id("referees"),
    name: v.optional(v.string()),
    pin: v.optional(v.string()),
    active: v.optional(v.boolean()),
    adminPin: v.string(),
  },
  handler: async (ctx, args) => {
    verifyAdminPin(args.adminPin);

    const { refereeId, adminPin: _, ...updates } = args;

    // Check PIN uniqueness if changing
    if (updates.pin) {
      const trimmedPin = updates.pin.trim();
      if (trimmedPin.length < 4 || trimmedPin.length > 6) {
        throw new Error("PIN moet 4-6 tekens zijn");
      }

      const existingReferee = await ctx.db
        .query("referees")
        .withIndex("by_pin", (q) => q.eq("pin", trimmedPin))
        .first();
      if (existingReferee && existingReferee._id !== refereeId) {
        throw new Error("PIN is al in gebruik door een scheidsrechter");
      }

      const existingCoach = await ctx.db
        .query("coaches")
        .withIndex("by_pin", (q) => q.eq("pin", trimmedPin))
        .first();
      if (existingCoach) {
        throw new Error("PIN is al in gebruik door een coach");
      }

      updates.pin = trimmedPin;
    }

    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, val]) => val !== undefined)
    );
    await ctx.db.patch(refereeId, filtered);
  },
});

export const deleteReferee = mutation({
  args: {
    refereeId: v.id("referees"),
    adminPin: v.string(),
  },
  handler: async (ctx, args) => {
    verifyAdminPin(args.adminPin);
    await ctx.db.delete(args.refereeId);
  },
});
