/**
 * Admin claim-window open/close for weekly referee pool.
 */
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireAdminAccess } from "./adminAuth";
import { getAuthenticatedEmail } from "./lib/adminAccess";
import {
  formatPlayWeekLabel,
  getDefaultClaimWindowClosesAt,
  getPlayWeekBounds,
} from "./lib/playWeek";
import { seasonKeyFromMs } from "./lib/season";
import { matchesInPlayWeek } from "./lib/matchesInPlayWeek";

export const getClaimWindowForWeek = query({
  args: {
    weekStartMs: v.optional(v.number()),
  },
  returns: v.union(
    v.object({
      _id: v.id("refereeClaimWindows"),
      seasonKey: v.string(),
      weekStartMs: v.number(),
      weekEndMs: v.number(),
      opensAt: v.number(),
      closesAt: v.number(),
      status: v.union(
        v.literal("scheduled"),
        v.literal("open"),
        v.literal("closed")
      ),
      weekLabel: v.string(),
      isEffectivelyOpen: v.boolean(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    const now = Date.now();
    const weekStartMs = args.weekStartMs ?? getPlayWeekBounds(now).weekStartMs;
    const doc = await ctx.db
      .query("refereeClaimWindows")
      .withIndex("by_week", (q) => q.eq("weekStartMs", weekStartMs))
      .unique();
    if (!doc) return null;

    const isEffectivelyOpen =
      doc.status === "open" && now >= doc.opensAt && now < doc.closesAt;

    return {
      _id: doc._id,
      seasonKey: doc.seasonKey,
      weekStartMs: doc.weekStartMs,
      weekEndMs: doc.weekEndMs,
      opensAt: doc.opensAt,
      closesAt: doc.closesAt,
      status: doc.status,
      weekLabel: formatPlayWeekLabel(doc.weekStartMs),
      isEffectivelyOpen,
    };
  },
});

export const getWeekAssignmentStats = query({
  args: {
    weekStartMs: v.optional(v.number()),
  },
  returns: v.object({
    weekStartMs: v.number(),
    weekEndMs: v.number(),
    weekLabel: v.string(),
    total: v.number(),
    claimed: v.number(),
    unassigned: v.number(),
  }),
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    const now = Date.now();
    const bounds = args.weekStartMs
      ? {
          weekStartMs: args.weekStartMs,
          weekEndMs: args.weekStartMs + 7 * 24 * 60 * 60 * 1000,
        }
      : getPlayWeekBounds(now);

    const inWeek = await matchesInPlayWeek(
      ctx,
      bounds.weekStartMs,
      bounds.weekEndMs
    );
    const claimed = inWeek.filter((m) => m.refereeId !== undefined).length;
    return {
      weekStartMs: bounds.weekStartMs,
      weekEndMs: bounds.weekEndMs,
      weekLabel: formatPlayWeekLabel(bounds.weekStartMs),
      total: inWeek.length,
      claimed,
      unassigned: inWeek.length - claimed,
    };
  },
});

export const openClaimWindow = mutation({
  args: {
    weekStartMs: v.optional(v.number()),
    closesAt: v.optional(v.number()),
    sendEmailNudge: v.optional(v.boolean()),
  },
  returns: v.id("refereeClaimWindows"),
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    const email = await getAuthenticatedEmail(ctx);
    const now = Date.now();
    const bounds = args.weekStartMs
      ? {
          weekStartMs: args.weekStartMs,
          weekEndMs: args.weekStartMs + 7 * 24 * 60 * 60 * 1000,
        }
      : getPlayWeekBounds(now);

    const closesAt =
      args.closesAt ?? getDefaultClaimWindowClosesAt(bounds.weekStartMs);
    if (closesAt <= now) {
      throw new Error("Sluitmoment moet in de toekomst liggen");
    }

    const seasonKey = seasonKeyFromMs(bounds.weekStartMs);
    const existing = await ctx.db
      .query("refereeClaimWindows")
      .withIndex("by_week", (q) => q.eq("weekStartMs", bounds.weekStartMs))
      .unique();

    let windowId;
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "open",
        opensAt: now,
        closesAt,
        weekEndMs: bounds.weekEndMs,
        seasonKey,
        updatedAt: now,
      });
      windowId = existing._id;
    } else {
      windowId = await ctx.db.insert("refereeClaimWindows", {
        seasonKey,
        weekStartMs: bounds.weekStartMs,
        weekEndMs: bounds.weekEndMs,
        opensAt: now,
        closesAt,
        status: "open",
        createdByEmail: email ?? undefined,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.scheduler.runAfter(
      0,
      internal.refereeNotifications.notifyClaimWindowOpened,
      { weekStartMs: bounds.weekStartMs, windowId }
    );

    if (args.sendEmailNudge === true) {
      await ctx.scheduler.runAfter(
        0,
        internal.refereeEmailActions.sendClaimOpenNudges,
        { weekStartMs: bounds.weekStartMs }
      );
    }

    return windowId;
  },
});

export const closeClaimWindow = mutation({
  args: {
    weekStartMs: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    const now = Date.now();
    const weekStartMs =
      args.weekStartMs ?? getPlayWeekBounds(now).weekStartMs;
    const existing = await ctx.db
      .query("refereeClaimWindows")
      .withIndex("by_week", (q) => q.eq("weekStartMs", weekStartMs))
      .unique();
    if (!existing) {
      throw new Error("Geen claimronde voor deze speelweek");
    }
    await ctx.db.patch(existing._id, {
      status: "closed",
      closesAt: Math.min(existing.closesAt, now),
      updatedAt: now,
    });
    return null;
  },
});

export const sendEmailNudgeNow = mutation({
  args: {
    weekStartMs: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    const weekStartMs =
      args.weekStartMs ?? getPlayWeekBounds(Date.now()).weekStartMs;
    await ctx.scheduler.runAfter(
      0,
      internal.refereeEmailActions.sendClaimOpenNudges,
      { weekStartMs }
    );
    return null;
  },
});

export const listUnassignedForWeek = query({
  args: {
    weekStartMs: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      matchId: v.id("matches"),
      publicCode: v.string(),
      teamName: v.string(),
      opponent: v.string(),
      isHome: v.boolean(),
      scheduledAt: v.optional(v.number()),
    })
  ),
  handler: async (ctx, args) => {
    await requireAdminAccess(ctx);
    const now = Date.now();
    const bounds = args.weekStartMs
      ? {
          weekStartMs: args.weekStartMs,
          weekEndMs: args.weekStartMs + 7 * 24 * 60 * 60 * 1000,
        }
      : getPlayWeekBounds(now);

    const inWeek = await matchesInPlayWeek(
      ctx,
      bounds.weekStartMs,
      bounds.weekEndMs
    );

    const rows = [];
    for (const match of inWeek) {
      if (match.refereeId) continue;
      const team = await ctx.db.get(match.teamId);
      rows.push({
        matchId: match._id,
        publicCode: match.publicCode,
        teamName: team?.name ?? "Team",
        opponent: match.opponent,
        isHome: match.isHome,
        scheduledAt: match.scheduledAt,
      });
    }
    rows.sort((a, b) => (a.scheduledAt ?? 0) - (b.scheduledAt ?? 0));
    return rows;
  },
});
