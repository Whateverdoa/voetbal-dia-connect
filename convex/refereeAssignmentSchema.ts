import { defineTable } from "convex/server";
import { v } from "convex/values";

export const clubRoleValidator = v.union(
  v.literal("club_admin"),
  v.literal("planner"),
  v.literal("coach"),
  v.literal("referee")
);

export const clubMembershipStatusValidator = v.union(
  v.literal("active"),
  v.literal("invited"),
  v.literal("suspended"),
  v.literal("revoked")
);

export const refereeProfileStatusValidator = v.union(
  v.literal("pending"),
  v.literal("active"),
  v.literal("inactive")
);

export const availabilityStatusValidator = v.union(
  v.literal("available"),
  v.literal("unavailable")
);

export const refereeNeedStatusValidator = v.union(
  v.literal("open"),
  v.literal("matching"),
  v.literal("awaiting_response"),
  v.literal("awaiting_confirmation"),
  v.literal("assigned"),
  v.literal("cancelled"),
  v.literal("completed")
);

export const refereeOfferStatusValidator = v.union(
  v.literal("pending"),
  v.literal("accepted"),
  v.literal("declined"),
  v.literal("expired"),
  v.literal("withdrawn")
);

export const refereeAssignmentStatusValidator = v.union(
  v.literal("confirmed"),
  v.literal("cancelled"),
  v.literal("completed"),
  v.literal("no_show")
);

export const assignmentAuditEventTypeValidator = v.union(
  v.literal("membership_created"),
  v.literal("membership_updated"),
  v.literal("referee_profile_created"),
  v.literal("referee_profile_updated"),
  v.literal("availability_created"),
  v.literal("need_created"),
  v.literal("offer_sent"),
  v.literal("offer_accepted"),
  v.literal("offer_declined"),
  v.literal("offer_expired"),
  v.literal("offer_withdrawn"),
  v.literal("assignment_confirmed"),
  v.literal("assignment_cancelled"),
  v.literal("assignment_completed"),
  v.literal("assignment_no_show"),
  v.literal("legacy_assignment_migrated"),
  v.literal("match_cancelled")
);

/** Thin local account record. Clerk remains the identity and session provider. */
export const appUsersTable = defineTable({
  tokenIdentifier: v.string(),
  clerkSubject: v.string(),
  email: v.optional(v.string()),
  displayName: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_token_identifier", ["tokenIdentifier"])
  .index("by_clerk_subject", ["clerkSubject"])
  .index("by_email", ["email"]);

export const clubMembershipsTable = defineTable({
  clubId: v.id("clubs"),
  userId: v.id("appUsers"),
  roles: v.array(clubRoleValidator),
  status: clubMembershipStatusValidator,
  legacyUserAccessId: v.optional(v.id("userAccess")),
  createdByUserId: v.optional(v.id("appUsers")),
  createdAt: v.number(),
  updatedAt: v.number(),
  version: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_club", ["clubId"])
  .index("by_club_and_user", ["clubId", "userId"]);

export const refereeProfilesTable = defineTable({
  clubId: v.id("clubs"),
  /** Optional only for legacy referees that have not linked a Clerk account yet. */
  userId: v.optional(v.id("appUsers")),
  legacyRefereeId: v.optional(v.id("referees")),
  displayName: v.string(),
  status: refereeProfileStatusValidator,
  homeLocation: v.optional(
    v.object({
      label: v.string(),
      latitude: v.optional(v.number()),
      longitude: v.optional(v.number()),
      precision: v.union(
        v.literal("club"),
        v.literal("city"),
        v.literal("postal_code")
      ),
    })
  ),
  travelRadiusKm: v.optional(v.number()),
  qualificationLevel: v.optional(v.string()),
  allowedAgeGroups: v.optional(v.array(v.string())),
  allowedMatchLevels: v.optional(v.array(v.string())),
  preferredDays: v.optional(v.array(v.number())),
  preferredStartMinutes: v.optional(v.array(v.number())),
  preferredClubIds: v.optional(v.array(v.id("clubs"))),
  preferredAgeGroups: v.optional(v.array(v.string())),
  blockedClubIds: v.optional(v.array(v.id("clubs"))),
  blockedTeamIds: v.optional(v.array(v.id("teams"))),
  privatePlannerNotes: v.optional(v.string()),
  maxMatchesPerDay: v.optional(v.number()),
  minimumRestMinutes: v.optional(v.number()),
  notificationPreferences: v.optional(
    v.object({
      pushOffers: v.boolean(),
      pushAssignments: v.boolean(),
      emailFallback: v.boolean(),
    })
  ),
  createdAt: v.number(),
  updatedAt: v.number(),
  version: v.number(),
})
  .index("by_club", ["clubId"])
  .index("by_user", ["userId"])
  .index("by_club_and_user", ["clubId", "userId"])
  .index("by_legacy_referee", ["legacyRefereeId"])
  .index("by_club_and_legacy_referee", ["clubId", "legacyRefereeId"]);

export const refereeAvailabilityWindowsTable = defineTable({
  refereeProfileId: v.id("refereeProfiles"),
  startsAt: v.number(),
  endsAt: v.number(),
  status: availabilityStatusValidator,
  recurrenceRule: v.optional(v.string()),
  source: v.union(
    v.literal("referee"),
    v.literal("planner"),
    v.literal("import"),
    v.literal("seed")
  ),
  note: v.optional(v.string()),
  createdByUserId: v.optional(v.id("appUsers")),
  createdAt: v.number(),
  updatedAt: v.number(),
  version: v.number(),
})
  .index("by_referee_and_starts_at", ["refereeProfileId", "startsAt"])
  .index("by_referee_and_ends_at", ["refereeProfileId", "endsAt"]);

export const matchRefereeNeedsTable = defineTable({
  matchId: v.id("matches"),
  clubId: v.id("clubs"),
  arrivalAt: v.optional(v.number()),
  expectedEndAt: v.optional(v.number()),
  venue: v.optional(v.string()),
  ageGroup: v.optional(v.string()),
  matchLevel: v.optional(v.string()),
  requiredQualification: v.optional(v.string()),
  neutralRefereeRequired: v.optional(v.boolean()),
  responseDeadline: v.optional(v.number()),
  assignmentDeadline: v.optional(v.number()),
  status: refereeNeedStatusValidator,
  policyVersion: v.optional(v.string()),
  createdByUserId: v.optional(v.id("appUsers")),
  createdAt: v.number(),
  updatedAt: v.number(),
  version: v.number(),
})
  .index("by_match", ["matchId"])
  .index("by_club_and_status", ["clubId", "status"])
  .index("by_status_and_assignment_deadline", ["status", "assignmentDeadline"]);

export const matchingRunsTable = defineTable({
  needId: v.id("matchRefereeNeeds"),
  clubId: v.id("clubs"),
  policyVersion: v.string(),
  createdByUserId: v.optional(v.id("appUsers")),
  createdByService: v.optional(v.string()),
  candidates: v.array(
    v.object({
      refereeProfileId: v.id("refereeProfiles"),
      eligible: v.boolean(),
      score: v.optional(v.number()),
      reasonCodes: v.array(v.string()),
      distanceKm: v.optional(v.number()),
      conflictCodes: v.array(v.string()),
    })
  ),
  createdAt: v.number(),
})
  .index("by_need_and_created_at", ["needId", "createdAt"])
  .index("by_club_and_created_at", ["clubId", "createdAt"]);

export const refereeOffersTable = defineTable({
  needId: v.id("matchRefereeNeeds"),
  matchId: v.id("matches"),
  clubId: v.id("clubs"),
  refereeProfileId: v.id("refereeProfiles"),
  status: refereeOfferStatusValidator,
  sentAt: v.number(),
  expiresAt: v.number(),
  respondedAt: v.optional(v.number()),
  responseNote: v.optional(v.string()),
  declineReasonCode: v.optional(v.string()),
  matchingRunId: v.optional(v.id("matchingRuns")),
  sentByUserId: v.id("appUsers"),
  correlationId: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
  version: v.number(),
})
  .index("by_need", ["needId"])
  .index("by_need_and_referee", ["needId", "refereeProfileId"])
  .index("by_referee_and_status", ["refereeProfileId", "status"])
  .index("by_club_and_status", ["clubId", "status"])
  .index("by_need_and_correlation", ["needId", "correlationId"])
  .index("by_status_and_expires_at", ["status", "expiresAt"]);

export const refereeAssignmentsTable = defineTable({
  needId: v.id("matchRefereeNeeds"),
  matchId: v.id("matches"),
  clubId: v.id("clubs"),
  refereeProfileId: v.id("refereeProfiles"),
  /** Legacy assignments have no accepted offer. */
  acceptedOfferId: v.optional(v.id("refereeOffers")),
  source: v.union(v.literal("offer_confirmation"), v.literal("legacy_migration")),
  status: refereeAssignmentStatusValidator,
  confirmedAt: v.number(),
  confirmedByUserId: v.optional(v.id("appUsers")),
  cancelledAt: v.optional(v.number()),
  cancelledByUserId: v.optional(v.id("appUsers")),
  cancellationReason: v.optional(v.string()),
  completedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number(),
  version: v.number(),
})
  .index("by_match", ["matchId"])
  .index("by_match_and_status", ["matchId", "status"])
  .index("by_need", ["needId"])
  .index("by_referee_and_status", ["refereeProfileId", "status"])
  .index("by_club_and_status", ["clubId", "status"]);

const auditMetadataValueValidator = v.union(
  v.string(),
  v.number(),
  v.boolean(),
  v.null()
);

export const assignmentAuditEventsTable = defineTable({
  actorType: v.union(v.literal("user"), v.literal("agent"), v.literal("system")),
  actorUserId: v.optional(v.id("appUsers")),
  actorServiceId: v.optional(v.string()),
  clubId: v.id("clubs"),
  matchId: v.optional(v.id("matches")),
  needId: v.optional(v.id("matchRefereeNeeds")),
  offerId: v.optional(v.id("refereeOffers")),
  assignmentId: v.optional(v.id("refereeAssignments")),
  membershipId: v.optional(v.id("clubMemberships")),
  refereeProfileId: v.optional(v.id("refereeProfiles")),
  availabilityWindowId: v.optional(v.id("refereeAvailabilityWindows")),
  eventType: assignmentAuditEventTypeValidator,
  previousStatus: v.optional(v.string()),
  newStatus: v.optional(v.string()),
  reasonCode: v.optional(v.string()),
  metadata: v.optional(v.record(v.string(), auditMetadataValueValidator)),
  correlationId: v.string(),
  requestId: v.optional(v.string()),
  createdAt: v.number(),
})
  .index("by_club_and_created_at", ["clubId", "createdAt"])
  .index("by_match_and_created_at", ["matchId", "createdAt"])
  .index("by_need_and_created_at", ["needId", "createdAt"])
  .index("by_correlation", ["correlationId"])
  .index("by_club_and_correlation", ["clubId", "correlationId"]);
