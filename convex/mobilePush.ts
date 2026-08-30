import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import {
  mobileDeviceEnvironmentValidator,
  mobilePushNotificationTypeValidator,
  mobilePushRouteTypeValidator,
} from "./refereeAssignmentSchema";

const DELIVERY_LEASE_MS = 2 * 60_000;

const claimedDeliveryValidator = v.object({
  deliveryId: v.id("mobilePushDeliveries"),
  deviceId: v.id("mobileDevices"),
  apnsToken: v.string(),
  environment: mobileDeviceEnvironmentValidator,
  notificationType: mobilePushNotificationTypeValidator,
  routeType: mobilePushRouteTypeValidator,
  resourceId: v.string(),
  attemptCount: v.number(),
});

export const claimDelivery = internalMutation({
  args: { deliveryId: v.id("mobilePushDeliveries") },
  returns: v.union(claimedDeliveryValidator, v.null()),
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId);
    if (
      !delivery ||
      !["pending", "failed", "sending"].includes(delivery.status)
    ) {
      return null;
    }
    const now = Date.now();
    if (delivery.nextAttemptAt !== undefined && delivery.nextAttemptAt > now) {
      return null;
    }
    if (!delivery.deviceId) {
      await ctx.db.patch(delivery._id, {
        status: "skipped",
        nextAttemptAt: undefined,
        providerReason: "missing_device",
        updatedAt: now,
      });
      return null;
    }
    const device = await ctx.db.get(delivery.deviceId);
    if (!device || device.status !== "active") {
      await ctx.db.patch(delivery._id, {
        status: "skipped",
        nextAttemptAt: undefined,
        providerReason: "inactive_device",
        updatedAt: now,
      });
      return null;
    }
    const attemptCount = delivery.attemptCount + 1;
    await ctx.db.patch(delivery._id, {
      status: "sending",
      attemptCount,
      nextAttemptAt: now + DELIVERY_LEASE_MS,
      updatedAt: now,
    });
    return {
      deliveryId: delivery._id,
      deviceId: device._id,
      apnsToken: device.apnsToken,
      environment: device.environment,
      notificationType: delivery.notificationType,
      routeType: delivery.routeType,
      resourceId: delivery.resourceId,
      attemptCount,
    };
  },
});

export const recordDeliveryResult = internalMutation({
  args: {
    deliveryId: v.id("mobilePushDeliveries"),
    deviceId: v.id("mobileDevices"),
    success: v.boolean(),
    providerStatus: v.optional(v.number()),
    providerId: v.optional(v.string()),
    providerReason: v.optional(v.string()),
    retryAt: v.optional(v.number()),
    disableDevice: v.boolean(),
  },
  returns: v.object({ shouldRetry: v.boolean() }),
  handler: async (ctx, args) => {
    const delivery = await ctx.db.get(args.deliveryId);
    if (!delivery || delivery.status !== "sending") {
      return { shouldRetry: false };
    }
    const now = Date.now();
    await ctx.db.patch(delivery._id, {
      status: args.success ? "sent" : "failed",
      providerStatus: args.providerStatus,
      providerId: args.providerId,
      providerReason: args.providerReason,
      nextAttemptAt: args.success ? undefined : args.retryAt,
      sentAt: args.success ? now : undefined,
      updatedAt: now,
    });
    if (args.disableDevice) {
      const device = await ctx.db.get(args.deviceId);
      if (device?.status === "active") {
        await ctx.db.patch(device._id, {
          status: "disabled",
          disabledAt: now,
          disableReason: args.providerReason ?? "provider_rejected_token",
          updatedAt: now,
        });
      }
    }
    return { shouldRetry: !args.success && args.retryAt !== undefined };
  },
});

export const dispatchDueDeliveries = internalMutation({
  args: { limit: v.optional(v.number()) },
  returns: v.object({ scheduled: v.number() }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const limit = Math.max(1, Math.min(args.limit ?? 100, 200));
    const pending = await ctx.db
      .query("mobilePushDeliveries")
      .withIndex("by_status_and_next_attempt", (q) =>
        q.eq("status", "pending").lte("nextAttemptAt", now)
      )
      .take(limit);
    const failed = await ctx.db
      .query("mobilePushDeliveries")
      .withIndex("by_status_and_next_attempt", (q) =>
        q
          .eq("status", "failed")
          .gt("nextAttemptAt", 0)
          .lte("nextAttemptAt", now)
      )
      .take(Math.max(0, limit - pending.length));
    const sending = await ctx.db
      .query("mobilePushDeliveries")
      .withIndex("by_status_and_next_attempt", (q) =>
        q
          .eq("status", "sending")
          .gt("nextAttemptAt", 0)
          .lte("nextAttemptAt", now)
      )
      .take(Math.max(0, limit - pending.length - failed.length));
    const due = [...pending, ...failed, ...sending];
    for (const delivery of due) {
      await ctx.scheduler.runAfter(0, internal.mobilePushActions.sendDelivery, {
        deliveryId: delivery._id,
      });
    }
    return { scheduled: due.length };
  },
});
