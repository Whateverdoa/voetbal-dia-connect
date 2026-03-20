/**
 * Admin operations for coaches
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdminAccess } from "./adminAuth";
import { getUserAccessByEmail, removeRoleFromUserAccess, upsertUserAccess } from "./lib/userAccess";

// ============ COACHES ============

export const createCoach = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    teamIds: v.array(v.id("teams")),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);

    const trimmedName = args.name.trim();
    const trimmedEmail = args.email.trim().toLowerCase();

    if (!trimmedName) {
      throw new Error("Naam is verplicht");
    }

    const existingByEmail = await ctx.db
      .query("coaches")
      .withIndex("by_email", (q) => q.eq("email", trimmedEmail))
      .first();
    if (existingByEmail) {
      throw new Error("E-mailadres is al gekoppeld aan een coach");
    }

    const coachId = await ctx.db.insert("coaches", {
      name: trimmedName,
      email: trimmedEmail,
      teamIds: args.teamIds,
      createdAt: Date.now(),
    });

    await upsertUserAccess(ctx, {
      email: trimmedEmail,
      roles: ["coach"],
      coachId,
      source: "admin_manual",
    });

    return coachId;
  },
});

export const listCoaches = query({
  handler: async (ctx) => {
    await requireAdminAccess(ctx);
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
    email: v.optional(v.string()),
    teamIds: v.optional(v.array(v.id("teams"))),
  },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);

    const { coachId, ...updates } = args;
    const currentCoach = await ctx.db.get(coachId);
    if (!currentCoach) {
      throw new Error("Coach niet gevonden");
    }

    if (updates.email !== undefined) {
      const trimmedEmail = updates.email.trim().toLowerCase();
      if (!trimmedEmail) {
        throw new Error("E-mailadres mag niet leeg zijn");
      }

      const existingByEmail = await ctx.db
        .query("coaches")
        .withIndex("by_email", (q) => q.eq("email", trimmedEmail))
        .first();
      if (existingByEmail && existingByEmail._id !== coachId) {
        throw new Error("E-mailadres is al gekoppeld aan een coach");
      }
      updates.email = trimmedEmail;
    }

    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(coachId, filtered);

    const nextCoach = await ctx.db.get(coachId);
    if (!nextCoach?.email) {
      throw new Error("Coach mist e-mailadres na update");
    }

    const existingAccess = await getUserAccessByEmail(ctx, currentCoach.email);
    const roles = Array.from(
      new Set([...(existingAccess?.roles ?? []), "coach"])
    ).sort() as ("admin" | "coach" | "referee")[];

    await upsertUserAccess(ctx, {
      email: nextCoach.email,
      roles,
      coachId,
      refereeId: existingAccess?.refereeId,
      active: existingAccess?.active ?? true,
      source: "coach_sync",
    });

    if (currentCoach.email && currentCoach.email !== nextCoach.email) {
      await removeRoleFromUserAccess(ctx, {
        email: currentCoach.email,
        role: "coach",
      });
    }
  },
});

export const deleteCoach = mutation({
  args: { coachId: v.id("coaches") },
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    const coach = await ctx.db.get(args.coachId);
    if (coach?.email) {
      await removeRoleFromUserAccess(ctx, {
        email: coach.email,
        role: "coach",
      });
    }
    await ctx.db.delete(args.coachId);
  },
});
