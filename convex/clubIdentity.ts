import { v } from "convex/values";
import {
  clubMembershipStatusValidator,
  clubRoleValidator,
} from "./refereeAssignmentSchema";
import {
  ALL_CLUB_ROLES,
  authenticatedMutation,
  authenticatedQuery,
  getAppUserForIdentity,
  identityMutation,
  identityQuery,
  requireClubRole,
  type ClubRole,
} from "./lib/clubAccess";
import {
  getAssignmentAuditByCorrelation,
  requireMatchingReplay,
} from "./lib/assignmentAudit";
import {
  getCurrentUserAccess,
  getUserAccessByEmail,
} from "./lib/userAccess";

const membershipSummaryValidator = v.object({
  membershipId: v.id("clubMemberships"),
  clubId: v.id("clubs"),
  clubName: v.string(),
  roles: v.array(clubRoleValidator),
  status: clubMembershipStatusValidator,
  version: v.number(),
});

function normalizeRoles(roles: ClubRole[]) {
  const normalized = Array.from(new Set(roles)).sort() as ClubRole[];
  if (normalized.length === 0) {
    throw new Error("VALIDATION_ERROR: at least one club role is required");
  }
  return normalized;
}

export const syncCurrentAccount = identityMutation({
  args: {},
  returns: v.object({
    userId: v.id("appUsers"),
    created: v.boolean(),
    email: v.union(v.string(), v.null()),
  }),
  handler: async (ctx) => {
    const now = Date.now();
    const email = ctx.identity.email?.trim().toLowerCase();
    const displayName = ctx.identity.name?.trim();
    const existing = await getAppUserForIdentity(ctx, ctx.identity);

    if (existing) {
      await ctx.db.patch(existing._id, {
        clerkSubject: ctx.identity.subject,
        email: email || undefined,
        displayName: displayName || undefined,
        updatedAt: now,
      });
      return {
        userId: existing._id,
        created: false,
        email: email || null,
      };
    }

    const userId = await ctx.db.insert("appUsers", {
      tokenIdentifier: ctx.identity.tokenIdentifier,
      clerkSubject: ctx.identity.subject,
      ...(email ? { email } : {}),
      ...(displayName ? { displayName } : {}),
      createdAt: now,
      updatedAt: now,
    });

    return { userId, created: true, email: email || null };
  },
});

export const getMyClubMemberships = authenticatedQuery({
  args: {},
  returns: v.array(membershipSummaryValidator),
  handler: async (ctx) => {
    const memberships = await ctx.db
      .query("clubMemberships")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .take(100);

    const summaries = await Promise.all(
      memberships.map(async (membership) => {
        const club = await ctx.db.get(membership.clubId);
        return club
          ? {
              membershipId: membership._id,
              clubId: membership.clubId,
              clubName: club.name,
              roles: membership.roles,
              status: membership.status,
              version: membership.version,
            }
          : null;
      })
    );

    return summaries.filter((summary) => summary !== null);
  },
});

export const getMyM1Status = identityQuery({
  args: {},
  returns: v.object({
    accountSynced: v.boolean(),
    memberships: v.array(membershipSummaryValidator),
  }),
  handler: async (ctx) => {
    const user = await getAppUserForIdentity(ctx, ctx.identity);
    if (!user) return { accountSynced: false, memberships: [] };
    const memberships = await ctx.db
      .query("clubMemberships")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .take(100);
    const summaries = await Promise.all(
      memberships.map(async (membership) => {
        const club = await ctx.db.get(membership.clubId);
        return club
          ? {
              membershipId: membership._id,
              clubId: membership.clubId,
              clubName: club.name,
              roles: membership.roles,
              status: membership.status,
              version: membership.version,
            }
          : null;
      })
    );
    return {
      accountSynced: true,
      memberships: summaries.filter((summary) => summary !== null),
    };
  },
});

export const bootstrapLegacyAdminMembership = authenticatedMutation({
  args: {
    clubId: v.id("clubs"),
    correlationId: v.string(),
  },
  returns: v.object({
    membershipId: v.id("clubMemberships"),
    roles: v.array(clubRoleValidator),
    created: v.boolean(),
    version: v.number(),
  }),
  handler: async (ctx, args) => {
    const legacyAccess = await getCurrentUserAccess(ctx);
    if (!legacyAccess?.active || !legacyAccess.roles.includes("admin")) {
      throw new Error("FORBIDDEN");
    }
    if (!(await ctx.db.get(args.clubId)) || !args.correlationId.trim()) {
      throw new Error("VALIDATION_ERROR");
    }
    const roles = ["club_admin", "planner"] as ClubRole[];
    const inputFingerprint = JSON.stringify({
      clubId: String(args.clubId),
      roles,
      legacyEmail: legacyAccess.email,
    });
    const replay = await getAssignmentAuditByCorrelation(
      ctx,
      args.clubId,
      args.correlationId
    );
    if (replay) {
      requireMatchingReplay(replay, ctx.user._id, inputFingerprint);
      if (!replay.membershipId) throw new Error("IDEMPOTENCY_RECORD_INVALID");
      const replayMembership = await ctx.db.get(replay.membershipId);
      const replayVersion = replay.metadata?.resultVersion;
      if (!replayMembership || typeof replayVersion !== "number") {
        throw new Error("IDEMPOTENCY_RECORD_INVALID");
      }
      return {
        membershipId: replay.membershipId,
        roles: replayMembership.roles,
        created: replay.eventType === "membership_created",
        version: replayVersion,
      };
    }

    const existing = await ctx.db
      .query("clubMemberships")
      .withIndex("by_club_and_user", (q) =>
        q.eq("clubId", args.clubId).eq("userId", ctx.user._id)
      )
      .unique();
    const nextRoles = Array.from(
      new Set([...(existing?.roles ?? []), ...roles])
    ).sort() as ClubRole[];
    const legacyUserAccess = await getUserAccessByEmail(
      ctx,
      legacyAccess.email
    );
    const now = Date.now();
    const nextVersion = (existing?.version ?? 0) + 1;
    let membershipId;
    if (existing) {
      await ctx.db.patch(existing._id, {
        roles: nextRoles,
        status: "active",
        legacyUserAccessId: legacyUserAccess?._id,
        updatedAt: now,
        version: nextVersion,
      });
      membershipId = existing._id;
    } else {
      membershipId = await ctx.db.insert("clubMemberships", {
        clubId: args.clubId,
        userId: ctx.user._id,
        roles: nextRoles,
        status: "active",
        ...(legacyUserAccess
          ? { legacyUserAccessId: legacyUserAccess._id }
          : {}),
        createdByUserId: ctx.user._id,
        createdAt: now,
        updatedAt: now,
        version: nextVersion,
      });
    }
    await ctx.db.insert("assignmentAuditEvents", {
      actorType: "user",
      actorUserId: ctx.user._id,
      clubId: args.clubId,
      membershipId,
      eventType: existing ? "membership_updated" : "membership_created",
      previousStatus: existing?.status,
      newStatus: "active",
      metadata: {
        inputFingerprint,
        migrationSource: "legacy_admin",
        resultVersion: nextVersion,
      },
      correlationId: args.correlationId,
      createdAt: now,
    });
    return {
      membershipId,
      roles: nextRoles,
      created: !existing,
      version: nextVersion,
    };
  },
});

export const getClubContext = authenticatedQuery({
  args: { clubId: v.id("clubs") },
  returns: v.object({
    clubId: v.id("clubs"),
    clubName: v.string(),
    membershipId: v.id("clubMemberships"),
    roles: v.array(clubRoleValidator),
  }),
  handler: async (ctx, args) => {
    const membership = await requireClubRole(
      ctx,
      ctx.user._id,
      args.clubId,
      ALL_CLUB_ROLES
    );
    const club = await ctx.db.get(args.clubId);
    if (!club) {
      throw new Error("NOT_FOUND");
    }
    return {
      clubId: club._id,
      clubName: club.name,
      membershipId: membership._id,
      roles: membership.roles,
    };
  },
});

export const setClubMembership = authenticatedMutation({
  args: {
    clubId: v.id("clubs"),
    userId: v.id("appUsers"),
    roles: v.array(clubRoleValidator),
    status: clubMembershipStatusValidator,
    correlationId: v.string(),
  },
  returns: v.object({
    membershipId: v.id("clubMemberships"),
    created: v.boolean(),
    version: v.number(),
  }),
  handler: async (ctx, args) => {
    const actorMembership = await requireClubRole(
      ctx,
      ctx.user._id,
      args.clubId,
      ["club_admin"]
    );
    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      throw new Error("NOT_FOUND");
    }
    if (!args.correlationId.trim()) {
      throw new Error("VALIDATION_ERROR: correlationId is required");
    }

    const roles = normalizeRoles(args.roles);
    const inputFingerprint = JSON.stringify({
      userId: String(args.userId),
      roles,
      status: args.status,
    });
    const replay = await getAssignmentAuditByCorrelation(
      ctx,
      args.clubId,
      args.correlationId
    );
    if (replay) {
      requireMatchingReplay(replay, ctx.user._id, inputFingerprint);
      if (!replay.membershipId) throw new Error("IDEMPOTENCY_RECORD_INVALID");
      const replayVersion = replay.metadata?.resultVersion;
      if (typeof replayVersion !== "number") {
        throw new Error("IDEMPOTENCY_RECORD_INVALID");
      }
      return {
        membershipId: replay.membershipId,
        created: replay.eventType === "membership_created",
        version: replayVersion,
      };
    }

    const existing = await ctx.db
      .query("clubMemberships")
      .withIndex("by_club_and_user", (q) =>
        q.eq("clubId", args.clubId).eq("userId", args.userId)
      )
      .unique();
    const now = Date.now();
    const nextVersion = (existing?.version ?? 0) + 1;
    let membershipId;

    if (existing) {
      await ctx.db.patch(existing._id, {
        roles,
        status: args.status,
        updatedAt: now,
        version: nextVersion,
      });
      membershipId = existing._id;
    } else {
      membershipId = await ctx.db.insert("clubMemberships", {
        clubId: args.clubId,
        userId: args.userId,
        roles,
        status: args.status,
        createdByUserId: ctx.user._id,
        createdAt: now,
        updatedAt: now,
        version: nextVersion,
      });
    }

    await ctx.db.insert("assignmentAuditEvents", {
      actorType: "user",
      actorUserId: ctx.user._id,
      clubId: args.clubId,
      membershipId,
      eventType: existing ? "membership_updated" : "membership_created",
      previousStatus: existing?.status,
      newStatus: args.status,
      metadata: {
        targetUserId: String(args.userId),
        roles: roles.join(","),
        actorMembershipId: String(actorMembership._id),
        inputFingerprint,
        resultVersion: nextVersion,
      },
      correlationId: args.correlationId,
      createdAt: now,
    });

    return {
      membershipId,
      created: !existing,
      version: nextVersion,
    };
  },
});
