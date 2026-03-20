/**
 * Admin operations for referees
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdminAccess } from "./adminAuth";
import { normalizeQualificationTags } from "../src/lib/admin/assignmentBoard";
import {
  getUserAccessByEmail,
  removeRoleFromUserAccess,
  upsertUserAccess,
} from "./lib/userAccess";

export const createReferee = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    qualificationTags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);

    const trimmedName = args.name.trim();
    const trimmedEmail = args.email.trim().toLowerCase();

    if (!trimmedName) {
      throw new Error("Naam is verplicht");
    }
    if (!trimmedEmail) {
      throw new Error("E-mailadres is verplicht");
    }

    const existingByEmail = await ctx.db
      .query("referees")
      .withIndex("by_email", (q) => q.eq("email", trimmedEmail))
      .first();
    if (existingByEmail) {
      throw new Error("E-mailadres is al gekoppeld aan een scheidsrechter");
    }

    const qualificationTags = normalizeQualificationTags(args.qualificationTags);
    const refereeId = await ctx.db.insert("referees", {
      name: trimmedName,
      email: trimmedEmail,
      active: true,
      ...(qualificationTags.length > 0 ? { qualificationTags } : {}),
      createdAt: Date.now(),
    });

    await upsertUserAccess(ctx, {
      email: trimmedEmail,
      roles: ["referee"],
      refereeId,
      source: "admin_manual",
    });

    return refereeId;
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
    qualificationTags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);

    const currentReferee = await ctx.db.get(args.refereeId);
    if (!currentReferee) {
      throw new Error("Scheidsrechter niet gevonden");
    }

    const updates: {
      name?: string;
      email?: string;
      active?: boolean;
      qualificationTags?: string[];
    } = {};

    if (args.name !== undefined) {
      const trimmedName = args.name.trim();
      if (!trimmedName) {
        throw new Error("Naam is verplicht");
      }
      updates.name = trimmedName;
    }

    if (args.email !== undefined) {
      const trimmedEmail = args.email.trim().toLowerCase();
      if (!trimmedEmail) {
        throw new Error("E-mailadres mag niet leeg zijn");
      }

      const existingByEmail = await ctx.db
        .query("referees")
        .withIndex("by_email", (q) => q.eq("email", trimmedEmail))
        .first();
      if (existingByEmail && existingByEmail._id !== args.refereeId) {
        throw new Error("E-mailadres is al gekoppeld aan een scheidsrechter");
      }

      updates.email = trimmedEmail;
    }

    if (args.active !== undefined) {
      updates.active = args.active;
    }

    if (args.qualificationTags !== undefined) {
      updates.qualificationTags = normalizeQualificationTags(args.qualificationTags);
    }

    await ctx.db.patch(args.refereeId, updates);

    const nextReferee = await ctx.db.get(args.refereeId);
    if (!nextReferee?.email) {
      throw new Error("Scheidsrechter mist e-mailadres na update");
    }

    const existingAccess = await getUserAccessByEmail(ctx, currentReferee.email);
    const roles = Array.from(
      new Set([...(existingAccess?.roles ?? []), "referee"])
    ).sort() as ("admin" | "coach" | "referee")[];

    await upsertUserAccess(ctx, {
      email: nextReferee.email,
      roles,
      coachId: existingAccess?.coachId,
      refereeId: nextReferee._id,
      active: nextReferee.active,
      source: "referee_sync",
    });

    if (currentReferee.email && currentReferee.email !== nextReferee.email) {
      await removeRoleFromUserAccess(ctx, {
        email: currentReferee.email,
        role: "referee",
      });
    }
  },
});

export const deleteReferee = mutation({
  args: {
    refereeId: v.id("referees"),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);

    const referee = await ctx.db.get(args.refereeId);
    if (referee?.email) {
      await removeRoleFromUserAccess(ctx, {
        email: referee.email,
        role: "referee",
      });
    }

    await ctx.db.delete(args.refereeId);
  },
});
