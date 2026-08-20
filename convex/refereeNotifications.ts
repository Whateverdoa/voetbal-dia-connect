/**
 * In-app referee notifications + internal helpers when claim windows open.
 */
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireRefereeAccess } from "./lib/userAccess";
import { formatPlayWeekLabel } from "./lib/playWeek";
import { isRefereeInClaimPool } from "./lib/refereeClaimPool";

export const listMyNotifications = query({
  args: {},
  returns: v.union(
    v.object({
      unreadCount: v.number(),
      notifications: v.array(
        v.object({
          _id: v.id("refereeNotifications"),
          type: v.string(),
          body: v.string(),
          matchId: v.optional(v.id("matches")),
          weekStartMs: v.optional(v.number()),
          createdAt: v.number(),
          readAt: v.optional(v.number()),
        })
      ),
    }),
    v.null()
  ),
  handler: async (ctx) => {
    try {
      const { referee } = await requireRefereeAccess(ctx);
      const rows = await ctx.db
        .query("refereeNotifications")
        .withIndex("by_referee_created", (q) =>
          q.eq("refereeId", referee._id)
        )
        .order("desc")
        .take(50);

      const notifications = rows.map((row) => ({
        _id: row._id,
        type: row.type,
        body: row.body,
        matchId: row.matchId,
        weekStartMs: row.weekStartMs,
        createdAt: row.createdAt,
        readAt: row.readAt,
      }));

      return {
        unreadCount: notifications.filter((n) => n.readAt === undefined).length,
        notifications,
      };
    } catch {
      return null;
    }
  },
});

export const markNotificationRead = mutation({
  args: { notificationId: v.id("refereeNotifications") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { referee } = await requireRefereeAccess(ctx);
    const doc = await ctx.db.get(args.notificationId);
    if (!doc || doc.refereeId !== referee._id) {
      throw new Error("Melding niet gevonden");
    }
    if (doc.readAt === undefined) {
      await ctx.db.patch(args.notificationId, { readAt: Date.now() });
    }
    return null;
  },
});

export const markAllNotificationsRead = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const { referee } = await requireRefereeAccess(ctx);
    const rows = await ctx.db
      .query("refereeNotifications")
      .withIndex("by_referee_created", (q) => q.eq("refereeId", referee._id))
      .collect();
    const now = Date.now();
    for (const row of rows) {
      if (row.readAt === undefined) {
        await ctx.db.patch(row._id, { readAt: now });
      }
    }
    return null;
  },
});

export const notifyClaimWindowOpened = internalMutation({
  args: {
    weekStartMs: v.number(),
    windowId: v.id("refereeClaimWindows"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const window = await ctx.db.get(args.windowId);
    if (!window || window.status !== "open") return null;

    const label = formatPlayWeekLabel(args.weekStartMs);
    const body = `Claimronde speelweek ${label} is open. Bekijk Beschikbaar om een wedstrijd te kiezen.`;
    const now = Date.now();

    const referees = await ctx.db.query("referees").collect();
    for (const referee of referees) {
      if (!isRefereeInClaimPool(referee)) continue;
      await ctx.db.insert("refereeNotifications", {
        refereeId: referee._id,
        type: "claim_open",
        weekStartMs: args.weekStartMs,
        body,
        createdAt: now,
      });
    }
    return null;
  },
});

export const notifyAssigned = internalMutation({
  args: {
    refereeId: v.id("referees"),
    matchId: v.id("matches"),
    body: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("refereeNotifications", {
      refereeId: args.refereeId,
      type: "assigned",
      matchId: args.matchId,
      body: args.body,
      createdAt: Date.now(),
    });
    return null;
  },
});

export const createWindowClosingReminders = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const openWindows = await ctx.db
      .query("refereeClaimWindows")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();

    for (const window of openWindows) {
      if (now >= window.closesAt) {
        await ctx.db.patch(window._id, {
          status: "closed",
          updatedAt: now,
        });
        continue;
      }

      const msLeft = window.closesAt - now;
      const oneDay = 24 * 60 * 60 * 1000;
      if (msLeft > oneDay || msLeft < 0) continue;
      if (window.closingReminderSentAt !== undefined) continue;

      const label = formatPlayWeekLabel(window.weekStartMs);
      const body = `Claimronde speelweek ${label} sluit binnenkort. Claim nu als je nog kunt.`;
      const referees = await ctx.db.query("referees").collect();
      for (const referee of referees) {
        if (!isRefereeInClaimPool(referee)) continue;
        await ctx.db.insert("refereeNotifications", {
          refereeId: referee._id,
          type: "window_closing",
          weekStartMs: window.weekStartMs,
          body,
          createdAt: now,
        });
      }
      await ctx.db.patch(window._id, {
        closingReminderSentAt: now,
        updatedAt: now,
      });
    }
    return null;
  },
});
