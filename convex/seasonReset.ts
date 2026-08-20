/**
 * Hard reset for a new season: purge seasonal data, keep clubs/teams + admin emails.
 *
 *   npx convex run seasonReset:inventory '{"opsSecret":"..."}'
 *   npx convex run seasonReset:purgeBatch '{"opsSecret":"...","table":"players","limit":100}'
 *   npx convex run seasonReset:resetUserAccessKeepAdmins '{"opsSecret":"...","emails":[...]}'
 *   npx convex run seasonReset:ensureAdmins '{"opsSecret":"...","emails":[...]}'
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdminOrOps } from "./lib/opsAuth";
import { upsertUserAccess } from "./lib/userAccess";

const PURGE_TABLES = [
  "matchEvents",
  "matchPlayers",
  "matchStoppages",
  "substitutionPlans",
  "matchCommandDedupes",
  "matches",
  "wedstrijden",
  "playerConsents",
  "refereeNotifications",
  "refereeClaimWindows",
  "formationTemplates",
  "players",
  "coaches",
  "referees",
] as const;

type PurgeTable = (typeof PURGE_TABLES)[number];

export const inventory = query({
  args: { opsSecret: v.optional(v.string()) },
  returns: v.object({
    exportedAt: v.string(),
    counts: v.record(v.string(), v.number()),
    admins: v.array(v.string()),
    teams: v.array(
      v.object({
        _id: v.id("teams"),
        name: v.string(),
        slug: v.string(),
        isSelectionTeam: v.optional(v.boolean()),
      })
    ),
  }),
  handler: async (ctx, args) => {
    await requireAdminOrOps(ctx, args.opsSecret);
    const counts: Record<string, number> = {};
    for (const table of [
      "clubs",
      "teams",
      "userAccess",
      ...PURGE_TABLES,
    ] as const) {
      counts[table] = (await ctx.db.query(table).collect()).length;
    }
    const access = await ctx.db.query("userAccess").collect();
    const admins = access
      .filter((u) => u.active && u.roles.includes("admin"))
      .map((u) => u.email)
      .sort();
    const teams = (await ctx.db.query("teams").collect()).map((t) => ({
      _id: t._id,
      name: t.name,
      slug: t.slug,
      isSelectionTeam: t.isSelectionTeam,
    }));
    return {
      exportedAt: new Date().toISOString(),
      counts,
      admins,
      teams: teams.sort((a, b) => a.slug.localeCompare(b.slug)),
    };
  },
});

/** Delete up to `limit` docs from one seasonal table. Repeat until deleted=0. */
export const purgeBatch = mutation({
  args: {
    opsSecret: v.optional(v.string()),
    table: v.string(),
    limit: v.optional(v.number()),
    dryRun: v.optional(v.boolean()),
  },
  returns: v.object({
    table: v.string(),
    dryRun: v.boolean(),
    deleted: v.number(),
    remaining: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireAdminOrOps(ctx, args.opsSecret);
    if (!(PURGE_TABLES as readonly string[]).includes(args.table)) {
      throw new Error(`Table niet toegestaan voor purge: ${args.table}`);
    }
    const table = args.table as PurgeTable;
    const dryRun = args.dryRun ?? true;
    const limit = Math.min(Math.max(args.limit ?? 80, 1), 150);
    const all = await ctx.db.query(table).collect();
    const targets = all.slice(0, limit);
    if (dryRun) {
      return {
        table,
        dryRun: true,
        deleted: targets.length,
        remaining: all.length,
      };
    }
    for (const doc of targets) {
      await ctx.db.delete(doc._id);
    }
    const remaining = (await ctx.db.query(table).collect()).length;
    return { table, dryRun: false, deleted: targets.length, remaining };
  },
});

/** Delete all userAccess, then recreate listed admins (no coach/ref FK links). */
export const resetUserAccessKeepAdmins = mutation({
  args: {
    opsSecret: v.optional(v.string()),
    emails: v.array(v.string()),
    dryRun: v.optional(v.boolean()),
  },
  returns: v.object({
    dryRun: v.boolean(),
    kept: v.array(v.string()),
    deleted: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireAdminOrOps(ctx, args.opsSecret);
    const dryRun = args.dryRun ?? true;
    const keep = [
      ...new Set(
        args.emails
          .map((e) => e.trim().toLowerCase())
          .filter((e) => e.includes("@"))
      ),
    ].sort();
    if (keep.length === 0) throw new Error("Minimaal één admin e-mail vereist");

    const all = await ctx.db.query("userAccess").collect();
    if (dryRun) {
      return { dryRun: true, kept: keep, deleted: all.length };
    }

    for (const row of all) {
      await ctx.db.delete(row._id);
    }
    for (const email of keep) {
      await upsertUserAccess(ctx, {
        email,
        roles: ["admin", "coach", "referee"],
        active: true,
        source: "bootstrap_admin",
      });
    }

    return { dryRun: false, kept: keep, deleted: all.length };
  },
});

/** Ensure listed emails have active admin+coach+referee access. */
export const ensureAdmins = mutation({
  args: {
    opsSecret: v.optional(v.string()),
    emails: v.array(v.string()),
  },
  returns: v.object({ emails: v.array(v.string()) }),
  handler: async (ctx, args) => {
    await requireAdminOrOps(ctx, args.opsSecret);
    const emails = [
      ...new Set(
        args.emails.map((e) => e.trim().toLowerCase()).filter((e) => e.includes("@"))
      ),
    ].sort();
    for (const email of emails) {
      await upsertUserAccess(ctx, {
        email,
        roles: ["admin", "coach", "referee"],
        active: true,
        source: "bootstrap_admin",
      });
    }
    return { emails };
  },
});
