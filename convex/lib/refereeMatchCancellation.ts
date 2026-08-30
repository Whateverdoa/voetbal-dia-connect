import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { queueMobilePushForReferee } from "./mobilePushQueue";

const CANCELLATION_REASON = "MATCH_CANCELLED";

type MatchCancellationInput = {
  matchId: Id<"matches">;
  cancelledAt: number;
  actorServiceId: string;
  correlationId: string;
};

export async function cancelRefereeWorkflowForMatch(
  ctx: MutationCtx,
  input: MatchCancellationInput
) {
  const actorServiceId = input.actorServiceId.trim();
  const correlationId = input.correlationId.trim();
  if (
    !actorServiceId ||
    !correlationId ||
    !Number.isFinite(input.cancelledAt) ||
    input.cancelledAt <= 0
  ) {
    throw new Error("VALIDATION_ERROR");
  }

  const match = await ctx.db.get(input.matchId);
  if (!match) throw new Error("NOT_FOUND");
  const team = await ctx.db.get(match.teamId);
  if (!team) throw new Error("NOT_FOUND");

  const needs = await ctx.db
    .query("matchRefereeNeeds")
    .withIndex("by_match", (q) => q.eq("matchId", match._id))
    .take(10);
  const activeOffers = (
    await Promise.all(
      needs.flatMap((need) =>
        (["pending", "accepted"] as const).map((status) =>
          ctx.db
            .query("refereeOffers")
            .withIndex("by_need_and_status", (q) =>
              q.eq("needId", need._id).eq("status", status)
            )
            .take(100)
        )
      )
    )
  ).flat();
  const assignments = await ctx.db
    .query("refereeAssignments")
    .withIndex("by_match_and_status", (q) =>
      q.eq("matchId", match._id).eq("status", "confirmed")
    )
    .take(10);

  const activeNeeds = needs.filter(
    (need) => !["cancelled", "completed"].includes(need.status)
  );
  const matchWasAlreadyCancelled = match.cancelledAt !== undefined;
  const hasWorkflowTransition =
    activeNeeds.length > 0 || activeOffers.length > 0 || assignments.length > 0;

  if (!matchWasAlreadyCancelled || match.refereeId !== undefined) {
    await ctx.db.patch(match._id, {
      cancelledAt: match.cancelledAt ?? input.cancelledAt,
      refereeId: undefined,
    });
  }

  for (const need of activeNeeds) {
    await ctx.db.patch(need._id, {
      status: "cancelled",
      updatedAt: input.cancelledAt,
      version: need.version + 1,
    });
  }

  const cancelledAssignmentByOffer = new Map(
    assignments.flatMap((assignment) =>
      assignment.acceptedOfferId
        ? [[assignment.acceptedOfferId, assignment] as const]
        : []
    )
  );
  for (const offer of activeOffers) {
    await ctx.db.patch(offer._id, {
      status: "withdrawn",
      updatedAt: input.cancelledAt,
      version: offer.version + 1,
    });
    await ctx.db.insert("assignmentAuditEvents", {
      actorType: "system",
      actorServiceId,
      clubId: team.clubId,
      matchId: match._id,
      needId: offer.needId,
      offerId: offer._id,
      assignmentId: cancelledAssignmentByOffer.get(offer._id)?._id,
      refereeProfileId: offer.refereeProfileId,
      eventType: "offer_withdrawn",
      previousStatus: offer.status,
      newStatus: "withdrawn",
      reasonCode: CANCELLATION_REASON,
      correlationId: `${correlationId}:offer:${offer._id}`,
      createdAt: input.cancelledAt,
    });

    if (!cancelledAssignmentByOffer.has(offer._id)) {
      const profile = await ctx.db.get(offer.refereeProfileId);
      if (profile) {
        await queueMobilePushForReferee(ctx, profile, {
          notificationType: "offer_withdrawn",
          routeType: "referee_offer",
          resourceId: String(offer._id),
          eventKey: `offer_withdrawn:${offer._id}:${offer.version + 1}`,
        });
      }
    }
  }

  for (const assignment of assignments) {
    const nextVersion = assignment.version + 1;
    await ctx.db.patch(assignment._id, {
      status: "cancelled",
      cancelledAt: input.cancelledAt,
      cancellationReason: CANCELLATION_REASON,
      updatedAt: input.cancelledAt,
      version: nextVersion,
    });
    await ctx.db.insert("assignmentAuditEvents", {
      actorType: "system",
      actorServiceId,
      clubId: team.clubId,
      matchId: match._id,
      needId: assignment.needId,
      offerId: assignment.acceptedOfferId,
      assignmentId: assignment._id,
      refereeProfileId: assignment.refereeProfileId,
      eventType: "assignment_cancelled",
      previousStatus: assignment.status,
      newStatus: "cancelled",
      reasonCode: CANCELLATION_REASON,
      correlationId: `${correlationId}:assignment:${assignment._id}`,
      createdAt: input.cancelledAt,
    });
    const profile = await ctx.db.get(assignment.refereeProfileId);
    if (profile) {
      await queueMobilePushForReferee(ctx, profile, {
        notificationType: "assignment_cancelled",
        routeType: "referee_assignment",
        resourceId: String(assignment._id),
        eventKey: `assignment_cancelled:${assignment._id}:${nextVersion}`,
      });
    }
  }

  if (!matchWasAlreadyCancelled || hasWorkflowTransition) {
    await ctx.db.insert("assignmentAuditEvents", {
      actorType: "system",
      actorServiceId,
      clubId: team.clubId,
      matchId: match._id,
      needId: needs.length === 1 ? needs[0]._id : undefined,
      eventType: "match_cancelled",
      previousStatus: matchWasAlreadyCancelled ? "cancelled" : match.status,
      newStatus: "cancelled",
      reasonCode: CANCELLATION_REASON,
      metadata: {
        needsCancelled: activeNeeds.length,
        offersWithdrawn: activeOffers.length,
        assignmentsCancelled: assignments.length,
      },
      correlationId,
      createdAt: input.cancelledAt,
    });
  }

  return {
    matchWasAlreadyCancelled,
    needsCancelled: activeNeeds.length,
    offersWithdrawn: activeOffers.length,
    assignmentsCancelled: assignments.length,
  };
}
