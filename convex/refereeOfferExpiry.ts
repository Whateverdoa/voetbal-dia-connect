import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import { queueMobilePushForReferee } from "./lib/mobilePushQueue";

export const expirePendingOffers = internalMutation({
  args: { limit: v.optional(v.number()) },
  returns: v.object({ expired: v.number(), reopenedNeeds: v.number() }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const limit = Math.max(1, Math.min(args.limit ?? 100, 200));
    const offers = await ctx.db
      .query("refereeOffers")
      .withIndex("by_status_and_expires_at", (q) =>
        q.eq("status", "pending").lte("expiresAt", now)
      )
      .take(limit);
    let reopenedNeeds = 0;

    for (const offer of offers) {
      const nextOfferVersion = offer.version + 1;
      await ctx.db.patch(offer._id, {
        status: "expired",
        updatedAt: now,
        version: nextOfferVersion,
      });
      const need = await ctx.db.get(offer.needId);
      let resultNeedVersion = need?.version ?? 0;
      if (need?.status === "awaiting_response") {
        resultNeedVersion = need.version + 1;
        await ctx.db.patch(need._id, {
          status: "open",
          updatedAt: now,
          version: resultNeedVersion,
        });
        reopenedNeeds += 1;
      }
      await ctx.db.insert("assignmentAuditEvents", {
        actorType: "system",
        actorServiceId: "referee-offer-expiry",
        clubId: offer.clubId,
        matchId: offer.matchId,
        needId: offer.needId,
        offerId: offer._id,
        refereeProfileId: offer.refereeProfileId,
        eventType: "offer_expired",
        previousStatus: offer.status,
        newStatus: "expired",
        metadata: {
          resultOfferVersion: nextOfferVersion,
          resultNeedVersion,
        },
        correlationId: `expire:${offer._id}:${offer.version}`,
        createdAt: now,
      });
      const profile = await ctx.db.get(offer.refereeProfileId);
      if (profile) {
        await queueMobilePushForReferee(ctx, profile, {
          notificationType: "offer_expired",
          routeType: "referee_offer",
          resourceId: String(offer._id),
          eventKey: `offer_expired:${offer._id}:${nextOfferVersion}`,
        });
      }
    }

    return { expired: offers.length, reopenedNeeds };
  },
});
