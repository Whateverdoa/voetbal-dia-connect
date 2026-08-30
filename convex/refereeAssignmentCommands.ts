import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { authenticatedMutation, requireClubRole } from "./lib/clubAccess";
import {
  getAssignmentAuditByCorrelation,
  requireMatchingReplay,
} from "./lib/assignmentAudit";
import { evaluateRefereeEligibility } from "./lib/refereeAssignmentEligibility";
import {
  refereeAssignmentStatusValidator,
  refereeNeedStatusValidator,
  refereeOfferStatusValidator,
} from "./refereeAssignmentSchema";

const PLANNER_ROLES = ["club_admin", "planner"] as const;

function requireCorrelationId(correlationId: string) {
  if (!correlationId.trim()) throw new Error("VALIDATION_ERROR");
}

function requireVersion(actual: number, expected: number) {
  if (actual !== expected) throw new Error("VERSION_CONFLICT");
}

function replayNumber(
  metadata: Record<string, string | number | boolean | null> | undefined,
  key: string
) {
  const value = metadata?.[key];
  if (typeof value !== "number") throw new Error("IDEMPOTENCY_RECORD_INVALID");
  return value;
}

async function getMatchAndClub(ctx: MutationCtx, matchId: Id<"matches">) {
  const match = await ctx.db.get(matchId);
  if (!match) throw new Error("NOT_FOUND");
  const team = await ctx.db.get(match.teamId);
  if (!team) throw new Error("NOT_FOUND");
  return { match, clubId: team.clubId };
}

async function getOwnRefereeProfile(
  ctx: MutationCtx,
  clubId: Id<"clubs">,
  userId: Id<"appUsers">
) {
  await requireClubRole(ctx, userId, clubId, ["referee"]);
  const profile = await ctx.db
    .query("refereeProfiles")
    .withIndex("by_club_and_user", (q) =>
      q.eq("clubId", clubId).eq("userId", userId)
    )
    .unique();
  if (!profile || profile.status !== "active") {
    throw new Error("REFEREE_PROFILE_REQUIRED");
  }
  return profile;
}

function eligibilityError(codes: readonly string[]) {
  if (codes.includes("REFEREE_CONFLICT")) return "REFEREE_CONFLICT";
  if (codes.includes("REFEREE_UNAVAILABLE")) return "REFEREE_CONFLICT";
  return "REFEREE_NOT_ELIGIBLE";
}

export const createNeed = authenticatedMutation({
  args: {
    matchId: v.id("matches"),
    arrivalAt: v.optional(v.number()),
    expectedEndAt: v.optional(v.number()),
    venue: v.optional(v.string()),
    ageGroup: v.optional(v.string()),
    matchLevel: v.optional(v.string()),
    requiredQualification: v.optional(v.string()),
    neutralRefereeRequired: v.optional(v.boolean()),
    responseDeadline: v.optional(v.number()),
    assignmentDeadline: v.optional(v.number()),
    correlationId: v.string(),
  },
  returns: v.object({
    needId: v.id("matchRefereeNeeds"),
    status: refereeNeedStatusValidator,
    version: v.number(),
  }),
  handler: async (ctx, args) => {
    requireCorrelationId(args.correlationId);
    const { match, clubId } = await getMatchAndClub(ctx, args.matchId);
    await requireClubRole(ctx, ctx.user._id, clubId, PLANNER_ROLES);
    if (match.cancelledAt) throw new Error("MATCH_CANCELLED");
    if (
      args.arrivalAt !== undefined &&
      args.expectedEndAt !== undefined &&
      args.arrivalAt >= args.expectedEndAt
    ) {
      throw new Error("VALIDATION_ERROR");
    }
    if (
      args.responseDeadline !== undefined &&
      args.assignmentDeadline !== undefined &&
      args.responseDeadline > args.assignmentDeadline
    ) {
      throw new Error("VALIDATION_ERROR");
    }

    const inputFingerprint = JSON.stringify({
      matchId: String(args.matchId),
      arrivalAt: args.arrivalAt ?? null,
      expectedEndAt: args.expectedEndAt ?? null,
      venue: args.venue ?? null,
      ageGroup: args.ageGroup ?? null,
      matchLevel: args.matchLevel ?? null,
      requiredQualification: args.requiredQualification ?? null,
      neutralRefereeRequired: args.neutralRefereeRequired ?? null,
      responseDeadline: args.responseDeadline ?? null,
      assignmentDeadline: args.assignmentDeadline ?? null,
    });
    const replay = await getAssignmentAuditByCorrelation(
      ctx,
      clubId,
      args.correlationId
    );
    if (replay) {
      requireMatchingReplay(replay, ctx.user._id, inputFingerprint);
      if (!replay.needId) throw new Error("IDEMPOTENCY_RECORD_INVALID");
      return {
        needId: replay.needId,
        status: "open" as const,
        version: replayNumber(replay.metadata, "resultNeedVersion"),
      };
    }

    const existingNeed = await ctx.db
      .query("matchRefereeNeeds")
      .withIndex("by_match", (q) => q.eq("matchId", args.matchId))
      .first();
    if (existingNeed) throw new Error("NEED_ALREADY_EXISTS");
    const existingAssignment = await ctx.db
      .query("refereeAssignments")
      .withIndex("by_match_and_status", (q) =>
        q.eq("matchId", args.matchId).eq("status", "confirmed")
      )
      .first();
    if (existingAssignment || match.refereeId) {
      throw new Error("ASSIGNMENT_ALREADY_CONFIRMED");
    }

    const now = Date.now();
    const needId = await ctx.db.insert("matchRefereeNeeds", {
      matchId: args.matchId,
      clubId,
      arrivalAt: args.arrivalAt,
      expectedEndAt: args.expectedEndAt,
      venue: args.venue,
      ageGroup: args.ageGroup,
      matchLevel: args.matchLevel,
      requiredQualification: args.requiredQualification,
      neutralRefereeRequired: args.neutralRefereeRequired,
      responseDeadline: args.responseDeadline,
      assignmentDeadline: args.assignmentDeadline,
      status: "open",
      policyVersion: "manual-v1",
      createdByUserId: ctx.user._id,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });
    await ctx.db.insert("assignmentAuditEvents", {
      actorType: "user",
      actorUserId: ctx.user._id,
      clubId,
      matchId: args.matchId,
      needId,
      eventType: "need_created",
      newStatus: "open",
      metadata: { inputFingerprint, resultNeedVersion: 1 },
      correlationId: args.correlationId,
      createdAt: now,
    });
    return { needId, status: "open" as const, version: 1 };
  },
});

export const sendOffer = authenticatedMutation({
  args: {
    needId: v.id("matchRefereeNeeds"),
    refereeProfileId: v.id("refereeProfiles"),
    expiresAt: v.number(),
    needVersion: v.number(),
    matchingRunId: v.optional(v.id("matchingRuns")),
    correlationId: v.string(),
  },
  returns: v.object({
    offerId: v.id("refereeOffers"),
    offerStatus: refereeOfferStatusValidator,
    offerVersion: v.number(),
    needStatus: refereeNeedStatusValidator,
    needVersion: v.number(),
  }),
  handler: async (ctx, args) => {
    requireCorrelationId(args.correlationId);
    const need = await ctx.db.get(args.needId);
    const profile = await ctx.db.get(args.refereeProfileId);
    if (!need || !profile) throw new Error("NOT_FOUND");
    await requireClubRole(ctx, ctx.user._id, need.clubId, PLANNER_ROLES);
    const inputFingerprint = JSON.stringify({
      needId: String(args.needId),
      refereeProfileId: String(args.refereeProfileId),
      expiresAt: args.expiresAt,
      needVersion: args.needVersion,
      matchingRunId: args.matchingRunId ? String(args.matchingRunId) : null,
    });
    const replay = await getAssignmentAuditByCorrelation(
      ctx,
      need.clubId,
      args.correlationId
    );
    if (replay) {
      requireMatchingReplay(replay, ctx.user._id, inputFingerprint);
      if (!replay.offerId) throw new Error("IDEMPOTENCY_RECORD_INVALID");
      return {
        offerId: replay.offerId,
        offerStatus: "pending" as const,
        offerVersion: replayNumber(replay.metadata, "resultOfferVersion"),
        needStatus: "awaiting_response" as const,
        needVersion: replayNumber(replay.metadata, "resultNeedVersion"),
      };
    }

    requireVersion(need.version, args.needVersion);
    if (!profile.userId) throw new Error("REFEREE_ACCOUNT_REQUIRED");
    if (profile.clubId !== need.clubId) throw new Error("FORBIDDEN");
    if (!(["open", "matching"] as const).includes(need.status as "open" | "matching")) {
      throw new Error("INVALID_TRANSITION");
    }
    const now = Date.now();
    if (args.expiresAt <= now) throw new Error("VALIDATION_ERROR");
    if (need.responseDeadline && args.expiresAt > need.responseDeadline) {
      throw new Error("VALIDATION_ERROR");
    }
    const activeOffer = await ctx.db
      .query("refereeOffers")
      .withIndex("by_need", (q) => q.eq("needId", need._id))
      .take(100);
    if (activeOffer.some((offer) => ["pending", "accepted"].includes(offer.status))) {
      throw new Error("ACTIVE_OFFER_EXISTS");
    }
    const eligibility = await evaluateRefereeEligibility(ctx, need, profile);
    if (!eligibility.eligible) throw new Error(eligibilityError(eligibility.codes));

    const offerId = await ctx.db.insert("refereeOffers", {
      needId: need._id,
      matchId: need.matchId,
      clubId: need.clubId,
      refereeProfileId: profile._id,
      status: "pending",
      sentAt: now,
      expiresAt: args.expiresAt,
      matchingRunId: args.matchingRunId,
      sentByUserId: ctx.user._id,
      correlationId: args.correlationId,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });
    const nextNeedVersion = need.version + 1;
    await ctx.db.patch(need._id, {
      status: "awaiting_response",
      updatedAt: now,
      version: nextNeedVersion,
    });
    await ctx.db.insert("assignmentAuditEvents", {
      actorType: "user",
      actorUserId: ctx.user._id,
      clubId: need.clubId,
      matchId: need.matchId,
      needId: need._id,
      offerId,
      refereeProfileId: profile._id,
      eventType: "offer_sent",
      previousStatus: need.status,
      newStatus: "pending",
      metadata: {
        inputFingerprint,
        resultOfferVersion: 1,
        resultNeedVersion: nextNeedVersion,
      },
      correlationId: args.correlationId,
      createdAt: now,
    });
    return {
      offerId,
      offerStatus: "pending" as const,
      offerVersion: 1,
      needStatus: "awaiting_response" as const,
      needVersion: nextNeedVersion,
    };
  },
});

async function respondToOffer(
  ctx: MutationCtx & { user: Doc<"appUsers"> },
  args: {
    offerId: Id<"refereeOffers">;
    offerVersion: number;
    responseNote?: string;
    declineReasonCode?: string;
    correlationId: string;
  },
  response: "accepted" | "declined"
) {
  requireCorrelationId(args.correlationId);
  const offer = await ctx.db.get(args.offerId);
  if (!offer) throw new Error("NOT_FOUND");
  const profile = await getOwnRefereeProfile(ctx, offer.clubId, ctx.user._id);
  if (profile._id !== offer.refereeProfileId) throw new Error("FORBIDDEN");
  const inputFingerprint = JSON.stringify({
    offerId: String(args.offerId),
    offerVersion: args.offerVersion,
    response,
    responseNote: args.responseNote ?? null,
    declineReasonCode: args.declineReasonCode ?? null,
  });
  const replay = await getAssignmentAuditByCorrelation(
    ctx,
    offer.clubId,
    args.correlationId
  );
  if (replay) {
    requireMatchingReplay(replay, ctx.user._id, inputFingerprint);
    if (replay.offerId !== offer._id) throw new Error("IDEMPOTENCY_RECORD_INVALID");
    return {
      offerId: offer._id,
      offerStatus: response,
      offerVersion: replayNumber(replay.metadata, "resultOfferVersion"),
      needStatus:
        response === "accepted"
          ? ("awaiting_confirmation" as const)
          : ("open" as const),
      needVersion: replayNumber(replay.metadata, "resultNeedVersion"),
    };
  }

  requireVersion(offer.version, args.offerVersion);
  if (offer.status !== "pending") throw new Error("OFFER_ALREADY_RESPONDED");
  if (offer.expiresAt <= Date.now()) throw new Error("OFFER_EXPIRED");
  const need = await ctx.db.get(offer.needId);
  if (!need) throw new Error("NOT_FOUND");
  if (need.status !== "awaiting_response") throw new Error("INVALID_TRANSITION");

  const now = Date.now();
  const nextOfferVersion = offer.version + 1;
  const nextNeedVersion = need.version + 1;
  const nextNeedStatus: "awaiting_confirmation" | "open" =
    response === "accepted" ? "awaiting_confirmation" : "open";
  await ctx.db.patch(offer._id, {
    status: response,
    respondedAt: now,
    responseNote: args.responseNote,
    declineReasonCode:
      response === "declined" ? args.declineReasonCode : undefined,
    updatedAt: now,
    version: nextOfferVersion,
  });
  await ctx.db.patch(need._id, {
    status: nextNeedStatus,
    updatedAt: now,
    version: nextNeedVersion,
  });
  await ctx.db.insert("assignmentAuditEvents", {
    actorType: "user",
    actorUserId: ctx.user._id,
    clubId: offer.clubId,
    matchId: offer.matchId,
    needId: offer.needId,
    offerId: offer._id,
    refereeProfileId: offer.refereeProfileId,
    eventType: response === "accepted" ? "offer_accepted" : "offer_declined",
    previousStatus: offer.status,
    newStatus: response,
    reasonCode: args.declineReasonCode,
    metadata: {
      inputFingerprint,
      resultOfferVersion: nextOfferVersion,
      resultNeedVersion: nextNeedVersion,
    },
    correlationId: args.correlationId,
    createdAt: now,
  });
  return {
    offerId: offer._id,
    offerStatus: response,
    offerVersion: nextOfferVersion,
    needStatus: nextNeedStatus,
    needVersion: nextNeedVersion,
  };
}

const offerResponseReturns = v.object({
  offerId: v.id("refereeOffers"),
  offerStatus: refereeOfferStatusValidator,
  offerVersion: v.number(),
  needStatus: refereeNeedStatusValidator,
  needVersion: v.number(),
});

export const acceptOffer = authenticatedMutation({
  args: {
    offerId: v.id("refereeOffers"),
    offerVersion: v.number(),
    responseNote: v.optional(v.string()),
    correlationId: v.string(),
  },
  returns: offerResponseReturns,
  handler: async (ctx, args) =>
    await respondToOffer(ctx, args, "accepted"),
});

export const declineOffer = authenticatedMutation({
  args: {
    offerId: v.id("refereeOffers"),
    offerVersion: v.number(),
    responseNote: v.optional(v.string()),
    declineReasonCode: v.optional(v.string()),
    correlationId: v.string(),
  },
  returns: offerResponseReturns,
  handler: async (ctx, args) =>
    await respondToOffer(ctx, args, "declined"),
});

export const confirmAssignment = authenticatedMutation({
  args: {
    acceptedOfferId: v.id("refereeOffers"),
    offerVersion: v.number(),
    needVersion: v.number(),
    correlationId: v.string(),
  },
  returns: v.object({
    assignmentId: v.id("refereeAssignments"),
    assignmentStatus: refereeAssignmentStatusValidator,
    assignmentVersion: v.number(),
    needStatus: refereeNeedStatusValidator,
    needVersion: v.number(),
  }),
  handler: async (ctx, args) => {
    requireCorrelationId(args.correlationId);
    const offer = await ctx.db.get(args.acceptedOfferId);
    if (!offer) throw new Error("NOT_FOUND");
    const need = await ctx.db.get(offer.needId);
    const profile = await ctx.db.get(offer.refereeProfileId);
    if (!need || !profile) throw new Error("NOT_FOUND");
    await requireClubRole(ctx, ctx.user._id, offer.clubId, PLANNER_ROLES);
    const inputFingerprint = JSON.stringify({
      acceptedOfferId: String(args.acceptedOfferId),
      offerVersion: args.offerVersion,
      needVersion: args.needVersion,
    });
    const replay = await getAssignmentAuditByCorrelation(
      ctx,
      offer.clubId,
      args.correlationId
    );
    if (replay) {
      requireMatchingReplay(replay, ctx.user._id, inputFingerprint);
      if (!replay.assignmentId) throw new Error("IDEMPOTENCY_RECORD_INVALID");
      return {
        assignmentId: replay.assignmentId,
        assignmentStatus: "confirmed" as const,
        assignmentVersion: replayNumber(
          replay.metadata,
          "resultAssignmentVersion"
        ),
        needStatus: "assigned" as const,
        needVersion: replayNumber(replay.metadata, "resultNeedVersion"),
      };
    }

    requireVersion(offer.version, args.offerVersion);
    requireVersion(need.version, args.needVersion);
    if (offer.status !== "accepted" || need.status !== "awaiting_confirmation") {
      throw new Error("INVALID_TRANSITION");
    }
    const currentAssignment = await ctx.db
      .query("refereeAssignments")
      .withIndex("by_match_and_status", (q) =>
        q.eq("matchId", offer.matchId).eq("status", "confirmed")
      )
      .first();
    if (currentAssignment) throw new Error("ASSIGNMENT_ALREADY_CONFIRMED");
    const eligibility = await evaluateRefereeEligibility(ctx, need, profile);
    if (!eligibility.eligible) throw new Error(eligibilityError(eligibility.codes));

    const now = Date.now();
    const assignmentId = await ctx.db.insert("refereeAssignments", {
      needId: need._id,
      matchId: offer.matchId,
      clubId: offer.clubId,
      refereeProfileId: profile._id,
      acceptedOfferId: offer._id,
      source: "offer_confirmation",
      status: "confirmed",
      confirmedAt: now,
      confirmedByUserId: ctx.user._id,
      createdAt: now,
      updatedAt: now,
      version: 1,
    });
    const nextNeedVersion = need.version + 1;
    await ctx.db.patch(need._id, {
      status: "assigned",
      updatedAt: now,
      version: nextNeedVersion,
    });
    if (profile.legacyRefereeId) {
      await ctx.db.patch(offer.matchId, { refereeId: profile.legacyRefereeId });
    }

    const competingOffers = await ctx.db
      .query("refereeOffers")
      .withIndex("by_need", (q) => q.eq("needId", need._id))
      .take(100);
    for (const competingOffer of competingOffers) {
      if (
        competingOffer._id === offer._id ||
        !["pending", "accepted"].includes(competingOffer.status)
      ) {
        continue;
      }
      await ctx.db.patch(competingOffer._id, {
        status: "withdrawn",
        updatedAt: now,
        version: competingOffer.version + 1,
      });
      await ctx.db.insert("assignmentAuditEvents", {
        actorType: "user",
        actorUserId: ctx.user._id,
        clubId: offer.clubId,
        matchId: offer.matchId,
        needId: need._id,
        offerId: competingOffer._id,
        eventType: "offer_withdrawn",
        previousStatus: competingOffer.status,
        newStatus: "withdrawn",
        correlationId: `${args.correlationId}:withdraw:${competingOffer._id}`,
        createdAt: now,
      });
    }

    await ctx.db.insert("assignmentAuditEvents", {
      actorType: "user",
      actorUserId: ctx.user._id,
      clubId: offer.clubId,
      matchId: offer.matchId,
      needId: need._id,
      offerId: offer._id,
      assignmentId,
      refereeProfileId: profile._id,
      eventType: "assignment_confirmed",
      newStatus: "confirmed",
      metadata: {
        inputFingerprint,
        resultAssignmentVersion: 1,
        resultNeedVersion: nextNeedVersion,
      },
      correlationId: args.correlationId,
      createdAt: now,
    });
    return {
      assignmentId,
      assignmentStatus: "confirmed" as const,
      assignmentVersion: 1,
      needStatus: "assigned" as const,
      needVersion: nextNeedVersion,
    };
  },
});

export const cancelAssignment = authenticatedMutation({
  args: {
    assignmentId: v.id("refereeAssignments"),
    assignmentVersion: v.number(),
    reason: v.string(),
    reopenNeed: v.boolean(),
    correlationId: v.string(),
  },
  returns: v.object({
    assignmentId: v.id("refereeAssignments"),
    assignmentStatus: refereeAssignmentStatusValidator,
    assignmentVersion: v.number(),
    needStatus: refereeNeedStatusValidator,
    needVersion: v.number(),
  }),
  handler: async (ctx, args) => {
    requireCorrelationId(args.correlationId);
    if (!args.reason.trim()) throw new Error("VALIDATION_ERROR");
    const assignment = await ctx.db.get(args.assignmentId);
    if (!assignment) throw new Error("NOT_FOUND");
    const need = await ctx.db.get(assignment.needId);
    const profile = await ctx.db.get(assignment.refereeProfileId);
    if (!need || !profile) throw new Error("NOT_FOUND");
    await requireClubRole(ctx, ctx.user._id, assignment.clubId, PLANNER_ROLES);
    const inputFingerprint = JSON.stringify({
      assignmentId: String(args.assignmentId),
      assignmentVersion: args.assignmentVersion,
      reason: args.reason.trim(),
      reopenNeed: args.reopenNeed,
    });
    const replay = await getAssignmentAuditByCorrelation(
      ctx,
      assignment.clubId,
      args.correlationId
    );
    if (replay) {
      requireMatchingReplay(replay, ctx.user._id, inputFingerprint);
      if (replay.assignmentId !== assignment._id) {
        throw new Error("IDEMPOTENCY_RECORD_INVALID");
      }
      return {
        assignmentId: assignment._id,
        assignmentStatus: "cancelled" as const,
        assignmentVersion: replayNumber(
          replay.metadata,
          "resultAssignmentVersion"
        ),
        needStatus: args.reopenNeed ? ("open" as const) : ("cancelled" as const),
        needVersion: replayNumber(replay.metadata, "resultNeedVersion"),
      };
    }

    requireVersion(assignment.version, args.assignmentVersion);
    if (assignment.status !== "confirmed" || need.status !== "assigned") {
      throw new Error("INVALID_TRANSITION");
    }
    const now = Date.now();
    const nextAssignmentVersion = assignment.version + 1;
    const nextNeedVersion = need.version + 1;
    const nextNeedStatus: "open" | "cancelled" = args.reopenNeed
      ? "open"
      : "cancelled";
    await ctx.db.patch(assignment._id, {
      status: "cancelled",
      cancelledAt: now,
      cancelledByUserId: ctx.user._id,
      cancellationReason: args.reason.trim(),
      updatedAt: now,
      version: nextAssignmentVersion,
    });
    await ctx.db.patch(need._id, {
      status: nextNeedStatus,
      updatedAt: now,
      version: nextNeedVersion,
    });
    const match = await ctx.db.get(assignment.matchId);
    if (match && match.refereeId === profile.legacyRefereeId) {
      await ctx.db.patch(match._id, { refereeId: undefined });
    }
    await ctx.db.insert("assignmentAuditEvents", {
      actorType: "user",
      actorUserId: ctx.user._id,
      clubId: assignment.clubId,
      matchId: assignment.matchId,
      needId: assignment.needId,
      assignmentId: assignment._id,
      refereeProfileId: assignment.refereeProfileId,
      eventType: "assignment_cancelled",
      previousStatus: assignment.status,
      newStatus: "cancelled",
      reasonCode: args.reason.trim(),
      metadata: {
        inputFingerprint,
        reopenNeed: args.reopenNeed,
        resultAssignmentVersion: nextAssignmentVersion,
        resultNeedVersion: nextNeedVersion,
      },
      correlationId: args.correlationId,
      createdAt: now,
    });
    return {
      assignmentId: assignment._id,
      assignmentStatus: "cancelled" as const,
      assignmentVersion: nextAssignmentVersion,
      needStatus: nextNeedStatus,
      needVersion: nextNeedVersion,
    };
  },
});
