import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { queueMobilePushForReferee } from "./lib/mobilePushQueue";

const DEFAULT_REMINDER_WINDOW_MS = 2 * 60 * 60 * 1000;

export const queuePendingOfferReminders = internalMutation({
  args: {
    limit: v.optional(v.number()),
    reminderWindowMs: v.optional(v.number()),
  },
  returns: v.object({ reminded: v.number(), deliveriesQueued: v.number() }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const limit = Math.max(1, Math.min(args.limit ?? 100, 200));
    const reminderWindowMs = Math.max(
      60_000,
      Math.min(args.reminderWindowMs ?? DEFAULT_REMINDER_WINDOW_MS, 24 * 60 * 60 * 1000)
    );
    const offers = await ctx.db
      .query("refereeOffers")
      .withIndex("by_status_and_reminder_and_expires_at", (q) =>
        q
          .eq("status", "pending")
          .eq("reminderSentAt", undefined)
          .gt("expiresAt", now)
          .lte("expiresAt", now + reminderWindowMs)
      )
      .take(limit);
    let deliveriesQueued = 0;

    for (const offer of offers) {
      await ctx.db.patch(offer._id, { reminderSentAt: now, updatedAt: now });
      const profile = await ctx.db.get(offer.refereeProfileId);
      if (!profile) continue;
      deliveriesQueued += await queueMobilePushForReferee(ctx, profile, {
        notificationType: "offer_reminder",
        routeType: "referee_offer",
        resourceId: String(offer._id),
        eventKey: `offer_reminder:${offer._id}:${offer.version}`,
      });
    }
    return { reminded: offers.length, deliveriesQueued };
  },
});
