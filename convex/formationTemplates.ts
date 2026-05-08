import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { validateFormationSlots } from "./lib/formationTemplateValidate";
import type { Id } from "./_generated/dataModel";
import type { DatabaseReader } from "./_generated/server";

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

async function assertCoachOwnsTeam(
  ctx: { auth: { getUserIdentity: () => Promise<unknown> }; db: DatabaseReader },
  teamId: Id<"teams">
) {
  const identity = await ctx.auth.getUserIdentity();
  const email =
    identity && typeof identity === "object" && "email" in identity
      ? String((identity as { email?: string }).email ?? "").trim().toLowerCase()
      : "";
  if (!email) throw new Error("Niet ingelogd");

  const coach = await ctx.db
    .query("coaches")
    .withIndex("by_email", (q) => q.eq("email", email))
    .first();
  if (!coach || !coach.teamIds.includes(teamId)) {
    throw new Error("Geen toegang tot dit team");
  }
  return coach;
}

export const listForTeam = query({
  args: { teamId: v.id("teams") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const email = identity?.email?.trim().toLowerCase() ?? "";
    if (!email) return [];

    const coach = await ctx.db
      .query("coaches")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!coach || !coach.teamIds.includes(args.teamId)) {
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

    const identity = await ctx.auth.getUserIdentity();
    const email = identity?.email?.trim().toLowerCase() ?? "";
    if (!email) return null;

    const coach = await ctx.db
      .query("coaches")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();
    if (!coach || !coach.teamIds.includes(doc.teamId)) {
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
