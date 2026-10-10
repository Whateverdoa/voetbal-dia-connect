import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { validateFormationSlots } from "./lib/formationTemplateValidate";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { getCurrentUserAccess } from "./lib/userAccess";
import { hasAdminRole } from "./lib/adminOverride";

const slotValidator = v.object({
  id: v.number(),
  x: v.number(),
  y: v.number(),
  position: v.string(),
});

const linkValidator = v.object({
  from: v.number(),
  to: v.number(),
});

async function canAccessTeamFormations(
  ctx: QueryCtx | MutationCtx,
  teamId: Id<"teams">
): Promise<boolean> {
  const access = await getCurrentUserAccess(ctx);
  if (!access) return false;
  if (hasAdminRole(access)) return true;

  const email = access.email;
  const coach = await ctx.db
    .query("coaches")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();
  return !!coach && coach.teamIds.includes(teamId);
}

async function assertCoachOwnsTeam(
  ctx: QueryCtx | MutationCtx,
  teamId: Id<"teams">
) {
  if (!(await canAccessTeamFormations(ctx, teamId))) {
    throw new Error("Geen toegang tot dit team");
  }
}

export const listForTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    if (!(await canAccessTeamFormations(ctx, args.teamId))) {
      return [];
    }

    const rows = await ctx.db
      .query("formationTemplates")
      .withIndex("by_team", (q) => q.eq("teamId", args.teamId))
      .collect();

    return rows
      .filter((r) => r.active)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((r) => ({
        _id: r._id,
        name: r.name,
        kind: r.kind,
        structure: r.structure,
        updatedAt: r.updatedAt,
      }));
  },
});

export const getById = query({
  args: { templateId: v.id("formationTemplates") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.templateId);
    if (!doc || !doc.active) return null;

    if (!(await canAccessTeamFormations(ctx, doc.teamId))) {
      return null;
    }

    return doc;
  },
});

export const createTemplate = mutation({
  args: {
    teamId: v.id("teams"),
    name: v.string(),
    kind: v.union(v.literal("8v8"), v.literal("11v11")),
    structure: v.string(),
    slots: v.array(slotValidator),
    links: v.optional(v.array(linkValidator)),
  },
  handler: async (ctx, args) => {
    await assertCoachOwnsTeam(ctx, args.teamId);
    validateFormationSlots(args.kind, args.slots);

    const now = Date.now();
    const id = await ctx.db.insert("formationTemplates", {
      teamId: args.teamId,
      kind: args.kind,
      name: args.name.trim() || "Eigen formatie",
      structure: args.structure.trim(),
      slots: args.slots,
      links: args.links,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  },
});

export const updateTemplate = mutation({
  args: {
    templateId: v.id("formationTemplates"),
    name: v.optional(v.string()),
    structure: v.optional(v.string()),
    slots: v.optional(v.array(slotValidator)),
    links: v.optional(v.array(linkValidator)),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.templateId);
    if (!doc) throw new Error("Formatie niet gevonden");
    await assertCoachOwnsTeam(ctx, doc.teamId);

    const slots = args.slots ?? doc.slots;
    validateFormationSlots(doc.kind, slots);

    const now = Date.now();
    await ctx.db.patch(args.templateId, {
      name: args.name?.trim() ?? doc.name,
      structure: args.structure?.trim() ?? doc.structure,
      slots,
      links: args.links !== undefined ? args.links : doc.links,
      updatedAt: now,
    });
  },
});

export const archiveTemplate = mutation({
  args: { templateId: v.id("formationTemplates") },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.templateId);
    if (!doc) throw new Error("Formatie niet gevonden");
    await assertCoachOwnsTeam(ctx, doc.teamId);

    const now = Date.now();
    await ctx.db.patch(args.templateId, { active: false, updatedAt: now });

    const matches = await ctx.db
      .query("matches")
      .withIndex("by_team", (q) => q.eq("teamId", doc.teamId))
      .collect();
    for (const m of matches) {
      if (m.customFormationTemplateId === args.templateId) {
        await ctx.db.patch(m._id, {
          customFormationTemplateId: undefined,
        });
      }
    }
  },
});
