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
    email: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);

    const trimmedName = args.name.trim();
    if (!trimmedName) {
      refereeError("Naam is verplicht");
    }

    const emailNorm = args.email?.trim().toLowerCase();
    if (emailNorm) {
      const existingReferee = await ctx.db
        .query("referees")
        .withIndex("by_email", (q) => q.eq("email", emailNorm))
        .first();
      if (existingReferee) {
        refereeError("E-mail is al in gebruik door een scheidsrechter");
      }
    }

    return await ctx.db.insert("referees", {
      name: trimmedName,
      email: emailNorm ?? undefined,
      active: true,
      createdAt: Date.now(),
    });
  },
});

export const listReferees = query({
  handler: async (ctx) => {
    await requireAdminAccess(ctx);
    return await ctx.db.query("referees").collect();
  },
});

export const updateReferee = mutation({
  args: {
    refereeId: v.id("referees"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    active: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);

    const { refereeId, ...updates } = args;

    if (updates.email !== undefined) {
      const emailNorm = updates.email?.trim().toLowerCase() || undefined;
      if (emailNorm) {
        const existingReferee = await ctx.db
          .query("referees")
          .withIndex("by_email", (q) => q.eq("email", emailNorm))
          .first();
        if (existingReferee && existingReferee._id !== refereeId) {
          refereeError("E-mail is al in gebruik door een scheidsrechter");
        }
      }
      updates.email = emailNorm;
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
