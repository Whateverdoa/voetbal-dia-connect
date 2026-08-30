import { internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";

type NotificationType =
  | "offer_sent"
  | "offer_reminder"
  | "offer_expired"
  | "offer_withdrawn"
  | "assignment_confirmed"
  | "assignment_cancelled";

type RouteType = "referee_offer" | "referee_assignment";

function preferenceAllows(
  profile: Doc<"refereeProfiles">,
  notificationType: NotificationType
) {
  const preferences = profile.notificationPreferences;
  if (notificationType.startsWith("assignment_")) {
    return preferences?.pushAssignments !== false;
  }
  return preferences?.pushOffers !== false;
}

export async function queueMobilePushForReferee(
  ctx: MutationCtx,
  profile: Doc<"refereeProfiles">,
  input: {
    notificationType: NotificationType;
    routeType: RouteType;
    resourceId: string;
    eventKey: string;
  }
): Promise<number> {
  if (!profile.userId) return 0;
  const now = Date.now();
  const allowed = preferenceAllows(profile, input.notificationType);
  const devices = allowed
    ? await ctx.db
        .query("mobileDevices")
        .withIndex("by_user_and_status", (q) =>
          q.eq("userId", profile.userId!).eq("status", "active")
        )
        .take(20)
    : [];

  if (!allowed || devices.length === 0) {
    const eventKey = `${input.eventKey}:none`;
    const existing = await ctx.db
      .query("mobilePushDeliveries")
      .withIndex("by_event_key", (q) => q.eq("eventKey", eventKey))
      .unique();
    if (!existing) {
      await ctx.db.insert("mobilePushDeliveries", {
        recipientUserId: profile.userId,
        notificationType: input.notificationType,
        routeType: input.routeType,
        resourceId: input.resourceId,
        eventKey,
        status: "skipped",
        attemptCount: 0,
        providerReason: allowed
          ? "no_active_device"
          : "notification_preference_disabled",
        createdAt: now,
        updatedAt: now,
      });
    }
    return 0;
  }

  let queued = 0;
  for (const device of devices) {
    const eventKey = `${input.eventKey}:${device._id}`;
    const existing = await ctx.db
      .query("mobilePushDeliveries")
      .withIndex("by_event_key", (q) => q.eq("eventKey", eventKey))
      .unique();
    if (existing) continue;
    const deliveryId = await ctx.db.insert("mobilePushDeliveries", {
      recipientUserId: profile.userId,
      deviceId: device._id,
      notificationType: input.notificationType,
      routeType: input.routeType,
      resourceId: input.resourceId,
      eventKey,
      status: "pending",
      attemptCount: 0,
      nextAttemptAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.mobilePushActions.sendDelivery, {
      deliveryId,
    });
    queued += 1;
  }
  return queued;
}

export const testHelpers = { preferenceAllows };
