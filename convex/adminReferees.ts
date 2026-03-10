/**
 * Admin operations for referees
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { requireAdminAccess } from "./adminAuth";

function refereeError(message: string): never {
  throw new ConvexError(message);
}

export const createReferee = mutation({
  args: {
    name: v.string(),
    pin: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);

    const trimmedName = args.name.trim();
    if (!trimmedName) {
      refereeError("Naam is verplicht");
    }

    const trimmedPin = args.pin.trim();
    if (trimmedPin.length < 4 || trimmedPin.length > 6) {
      refereeError("PIN moet 4-6 tekens zijn");
    }

    // Check PIN uniqueness across referees AND coaches
    const existingReferee = await ctx.db
      .query("referees")
      .withIndex("by_pin", (q) => q.eq("pin", trimmedPin))
      .first();
    if (existingReferee) {
      refereeError("PIN is al in gebruik door een scheidsrechter");
    }

    const existingCoach = await ctx.db
      .query("coaches")
      .withIndex("by_pin", (q) => q.eq("pin", trimmedPin))
      .first();
    if (existingCoach) {
      refereeError("PIN is al in gebruik door een coach");
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
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);

    const { refereeId, ...updates } = args;

    // Check PIN uniqueness if changing
    if (updates.pin) {
      const trimmedPin = updates.pin.trim();
      if (trimmedPin.length < 4 || trimmedPin.length > 6) {
        refereeError("PIN moet 4-6 tekens zijn");
      }

      const existingReferee = await ctx.db
        .query("referees")
        .withIndex("by_pin", (q) => q.eq("pin", trimmedPin))
        .first();
      if (existingReferee && existingReferee._id !== refereeId) {
        refereeError("PIN is al in gebruik door een scheidsrechter");
      }

      const existingCoach = await ctx.db
        .query("coaches")
        .withIndex("by_pin", (q) => q.eq("pin", trimmedPin))
        .first();
      if (existingCoach) {
        refereeError("PIN is al in gebruik door een coach");
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
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    await ctx.db.delete(args.refereeId);
  },
});
