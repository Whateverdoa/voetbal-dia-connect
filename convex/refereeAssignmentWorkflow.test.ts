/// <reference types="vite/client" />
// @vitest-environment edge-runtime

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import { cancelRefereeWorkflowForMatch } from "./lib/refereeMatchCancellation";
import schema from "./schema";

const modules = import.meta.glob([
  "./**/*.ts",
  "!./**/*.test.ts",
  "!./auth.config.ts",
]);

type TestBackend = ReturnType<typeof convexTest>;

async function createFixture(t: TestBackend) {
  const plannerActor = t.withIdentity({ subject: "planner-workflow" });
  const refereeActor = t.withIdentity({ subject: "referee-workflow" });
  const otherRefereeActor = t.withIdentity({ subject: "other-referee-workflow" });
  const planner = await plannerActor.mutation(
    api.clubIdentity.syncCurrentAccount,
    {}
  );
  const referee = await refereeActor.mutation(
    api.clubIdentity.syncCurrentAccount,
    {}
  );
  const otherReferee = await otherRefereeActor.mutation(
    api.clubIdentity.syncCurrentAccount,
    {}
  );
  const startsAt = Date.now() + 24 * 60 * 60 * 1000;
  const { clubId, matchId } = await t.run(async (ctx) => {
    const now = Date.now();
    const clubId = await ctx.db.insert("clubs", {
      name: "Workflow Club",
      slug: `workflow-club-${now}`,
      createdAt: now,
    });
    const teamId = await ctx.db.insert("teams", {
      clubId,
      name: "JO12-1",
      slug: "jo12-1",
      createdAt: now,
    });
    for (const membership of [
      { userId: planner.userId, roles: ["planner"] as const },
      { userId: referee.userId, roles: ["referee"] as const },
      { userId: otherReferee.userId, roles: ["referee"] as const },
    ]) {
      await ctx.db.insert("clubMemberships", {
        clubId,
        userId: membership.userId,
        roles: [...membership.roles],
        status: "active",
        createdAt: now,
        updatedAt: now,
        version: 1,
      });
    }
    const matchId = await ctx.db.insert("matches", {
      teamId,
      publicCode: `WF${String(now).slice(-4)}`,
      opponent: "Test United JO12-1",
      isHome: true,
      scheduledAt: startsAt,
      status: "scheduled",
      currentQuarter: 1,
      quarterCount: 4,
      homeScore: 0,
      awayScore: 0,
      showLineup: false,
      createdAt: now,
    });
    return { clubId, matchId };
  });
  const profile = await plannerActor.mutation(
    api.refereeDomain.upsertRefereeProfile,
    {
      clubId,
      userId: referee.userId,
      displayName: "Workflow Referee",
      status: "active",
      qualificationLevel: "club-jeugd",
      allowedAgeGroups: ["JO12"],
      allowedMatchLevels: ["recreatief"],
      correlationId: `profile-${matchId}`,
    }
  );
  const otherProfile = await plannerActor.mutation(
    api.refereeDomain.upsertRefereeProfile,
    {
      clubId,
      userId: otherReferee.userId,
      displayName: "Other Referee",
      status: "active",
      qualificationLevel: "club-jeugd",
      allowedAgeGroups: ["JO12"],
      allowedMatchLevels: ["recreatief"],
      correlationId: `other-profile-${matchId}`,
    }
  );
  const need = await plannerActor.mutation(
    api.refereeAssignmentCommands.createNeed,
    {
      matchId,
      arrivalAt: startsAt - 30 * 60 * 1000,
      expectedEndAt: startsAt + 90 * 60 * 1000,
      venue: "Sportpark Test",
      ageGroup: "JO12",
      matchLevel: "recreatief",
      requiredQualification: "club-jeugd",
      responseDeadline: startsAt - 6 * 60 * 60 * 1000,
      assignmentDeadline: startsAt - 2 * 60 * 60 * 1000,
      correlationId: `need-${matchId}`,
    }
  );
  return {
    plannerActor,
    refereeActor,
    otherRefereeActor,
    clubId,
    matchId,
    startsAt,
    profileId: profile.profileId,
    otherProfileId: otherProfile.profileId,
    need,
  };
}

async function sendFixtureOffer(
  fixture: Awaited<ReturnType<typeof createFixture>>
) {
  return await fixture.plannerActor.mutation(
    api.refereeAssignmentCommands.sendOffer,
    {
      needId: fixture.need.needId,
      refereeProfileId: fixture.profileId,
      expiresAt: fixture.startsAt - 7 * 60 * 60 * 1000,
      needVersion: fixture.need.version,
      correlationId: `offer-${fixture.matchId}`,
    }
  );
}

describe("manual referee assignment workflow", () => {
  it("requires planner confirmation after referee acceptance", async () => {
    const t = convexTest(schema, modules);
    const fixture = await createFixture(t);
    await fixture.refereeActor.mutation(api.mobileDevices.registerMyDevice, {
      apnsToken: "cd".repeat(32),
      platform: "ios",
      appVersion: "0.1.0",
    });
    const sent = await sendFixtureOffer(fixture);
    const pendingOffers = await fixture.refereeActor.query(
      api.refereeAssignmentQueries.listMyOffers,
      { clubId: fixture.clubId, status: "pending" }
    );
    expect(pendingOffers).toHaveLength(1);
    const offerDetail = await fixture.refereeActor.query(
      api.refereeAssignmentQueries.getMyOffer,
      { offerId: sent.offerId }
    );
    expect(offerDetail).toMatchObject({
      offerId: sent.offerId,
      status: "pending",
      match: { matchId: fixture.matchId },
    });
    const awaitingQueue = await fixture.plannerActor.query(
      api.refereeAssignmentQueries.listPlannerQueue,
      { clubId: fixture.clubId, status: "awaiting_response" }
    );
    expect(awaitingQueue).toHaveLength(1);
    const accepted = await fixture.refereeActor.mutation(
      api.refereeAssignmentCommands.acceptOffer,
      {
        offerId: sent.offerId,
        offerVersion: sent.offerVersion,
        responseNote: "Ik kan deze wedstrijd doen",
        correlationId: `accept-${fixture.matchId}`,
      }
    );
    expect(accepted.offerStatus).toBe("accepted");
    expect(accepted.needStatus).toBe("awaiting_confirmation");

    const beforeConfirmation = await t.run(async (ctx) =>
      await ctx.db
        .query("refereeAssignments")
        .withIndex("by_match", (q) => q.eq("matchId", fixture.matchId))
        .take(10)
    );
    expect(beforeConfirmation).toHaveLength(0);

    const confirmed = await fixture.plannerActor.mutation(
      api.refereeAssignmentCommands.confirmAssignment,
      {
        acceptedOfferId: sent.offerId,
        offerVersion: accepted.offerVersion,
        needVersion: accepted.needVersion,
        correlationId: `confirm-${fixture.matchId}`,
      }
    );
    expect(confirmed.assignmentStatus).toBe("confirmed");
    expect(confirmed.needStatus).toBe("assigned");

    const assignments = await fixture.refereeActor.query(
      api.refereeAssignmentQueries.listMyAssignments,
      { clubId: fixture.clubId, status: "confirmed" }
    );
    expect(assignments).toHaveLength(1);
    const assignmentDetail = await fixture.refereeActor.query(
      api.refereeAssignmentQueries.getMyAssignment,
      { assignmentId: confirmed.assignmentId }
    );
    expect(assignmentDetail).toMatchObject({
      assignmentId: confirmed.assignmentId,
      status: "confirmed",
      match: { matchId: fixture.matchId },
    });
    const assignedQueue = await fixture.plannerActor.query(
      api.refereeAssignmentQueries.listPlannerQueue,
      { clubId: fixture.clubId, status: "assigned" }
    );
    expect(assignedQueue[0].assignment?.assignmentId).toBe(
      confirmed.assignmentId
    );
    const audit = await fixture.plannerActor.query(
      api.refereeAssignmentQueries.listNeedAudit,
      { needId: fixture.need.needId }
    );
    expect(audit.map((event) => event.eventType)).toEqual([
      "need_created",
      "offer_sent",
      "offer_accepted",
      "assignment_confirmed",
    ]);
    const deliveries = await t.run(async (ctx) =>
      await ctx.db.query("mobilePushDeliveries").take(10)
    );
    expect(
      deliveries.map((delivery) => ({
        type: delivery.notificationType,
        route: delivery.routeType,
        resourceId: delivery.resourceId,
      }))
    ).toEqual([
      {
        type: "offer_sent",
        route: "referee_offer",
        resourceId: String(sent.offerId),
      },
      {
        type: "assignment_confirmed",
        route: "referee_assignment",
        resourceId: String(confirmed.assignmentId),
      },
    ]);
  });

  it("queues an offer reminder only once before expiry", async () => {
    const t = convexTest(schema, modules);
    const fixture = await createFixture(t);
    await fixture.refereeActor.mutation(api.mobileDevices.registerMyDevice, {
      apnsToken: "ef".repeat(32),
      platform: "ios",
      appVersion: "0.1.0",
    });
    const sent = await sendFixtureOffer(fixture);
    await t.run(async (ctx) => {
      await ctx.db.patch(sent.offerId, {
        expiresAt: Date.now() + 60 * 60 * 1000,
      });
    });

    const first = await t.mutation(
      internal.refereeOfferReminders.queuePendingOfferReminders,
      { reminderWindowMs: 2 * 60 * 60 * 1000 }
    );
    const second = await t.mutation(
      internal.refereeOfferReminders.queuePendingOfferReminders,
      { reminderWindowMs: 2 * 60 * 60 * 1000 }
    );

    expect(first).toEqual({ reminded: 1, deliveriesQueued: 1 });
    expect(second).toEqual({ reminded: 0, deliveriesQueued: 0 });
    const reminders = await t.run(async (ctx) =>
      await ctx.db
        .query("mobilePushDeliveries")
        .withIndex("by_event_key")
        .take(10)
    );
    expect(reminders.filter((row) => row.notificationType === "offer_reminder"))
      .toHaveLength(1);
  });

  it("enforces offer ownership, versions, and idempotent responses", async () => {
    const t = convexTest(schema, modules);
    const fixture = await createFixture(t);
    await expect(
      fixture.plannerActor.mutation(api.refereeAssignmentCommands.sendOffer, {
        needId: fixture.need.needId,
        refereeProfileId: fixture.profileId,
        expiresAt: fixture.startsAt - 7 * 60 * 60 * 1000,
        needVersion: fixture.need.version + 1,
        correlationId: `wrong-version-${fixture.matchId}`,
      })
    ).rejects.toThrow("VERSION_CONFLICT");
    const sent = await sendFixtureOffer(fixture);
    await expect(
      fixture.otherRefereeActor.query(
        api.refereeAssignmentQueries.getMyOffer,
        { offerId: sent.offerId }
      )
    ).rejects.toThrow("FORBIDDEN");
    await expect(
      fixture.otherRefereeActor.mutation(
        api.refereeAssignmentCommands.acceptOffer,
        {
          offerId: sent.offerId,
          offerVersion: sent.offerVersion,
          correlationId: `foreign-accept-${fixture.matchId}`,
        }
      )
    ).rejects.toThrow("FORBIDDEN");

    const args = {
      offerId: sent.offerId,
      offerVersion: sent.offerVersion,
      correlationId: `accept-idempotent-${fixture.matchId}`,
    };
    const first = await fixture.refereeActor.mutation(
      api.refereeAssignmentCommands.acceptOffer,
      args
    );
    const replay = await fixture.refereeActor.mutation(
      api.refereeAssignmentCommands.acceptOffer,
      args
    );
    expect(replay).toEqual(first);
  });

  it("finds an active offer beyond a long offer history", async () => {
    const t = convexTest(schema, modules);
    const fixture = await createFixture(t);
    await t.run(async (ctx) => {
      const need = await ctx.db.get(fixture.need.needId);
      if (!need?.createdByUserId) throw new Error("missing fixture planner");
      const now = Date.now();
      for (let index = 0; index < 101; index += 1) {
        await ctx.db.insert("refereeOffers", {
          needId: need._id,
          matchId: fixture.matchId,
          clubId: fixture.clubId,
          refereeProfileId: fixture.profileId,
          status: "declined",
          sentAt: now - 10_000 + index,
          expiresAt: fixture.startsAt - 7 * 60 * 60 * 1000,
          respondedAt: now - 9_000 + index,
          sentByUserId: need.createdByUserId,
          correlationId: `historical-offer-${index}`,
          createdAt: now - 10_000 + index,
          updatedAt: now - 9_000 + index,
          version: 2,
        });
      }
      await ctx.db.insert("refereeOffers", {
        needId: need._id,
        matchId: fixture.matchId,
        clubId: fixture.clubId,
        refereeProfileId: fixture.profileId,
        status: "pending",
        sentAt: now,
        expiresAt: fixture.startsAt - 7 * 60 * 60 * 1000,
        sentByUserId: need.createdByUserId,
        correlationId: "active-offer-after-history",
        createdAt: now,
        updatedAt: now,
        version: 1,
      });
    });

    await expect(
      fixture.plannerActor.mutation(api.refereeAssignmentCommands.sendOffer, {
        needId: fixture.need.needId,
        refereeProfileId: fixture.otherProfileId,
        expiresAt: fixture.startsAt - 7 * 60 * 60 * 1000,
        needVersion: fixture.need.version,
        correlationId: `offer-after-long-history-${fixture.matchId}`,
      })
    ).rejects.toThrow("ACTIVE_OFFER_EXISTS");
  });

  it("expires pending offers and reopens their need", async () => {
    const t = convexTest(schema, modules);
    const fixture = await createFixture(t);
    const sent = await sendFixtureOffer(fixture);
    await t.run(async (ctx) => {
      await ctx.db.patch(sent.offerId, { expiresAt: Date.now() - 1 });
    });
    await expect(
      fixture.refereeActor.mutation(api.refereeAssignmentCommands.acceptOffer, {
        offerId: sent.offerId,
        offerVersion: sent.offerVersion,
        correlationId: `expired-accept-${fixture.matchId}`,
      })
    ).rejects.toThrow("OFFER_EXPIRED");

    const result = await t.mutation(
      internal.refereeOfferExpiry.expirePendingOffers,
      { limit: 100 }
    );
    expect(result).toEqual({ expired: 1, reopenedNeeds: 1 });
    const state = await t.run(async (ctx) => ({
      offer: await ctx.db.get(sent.offerId),
      need: await ctx.db.get(fixture.need.needId),
    }));
    expect(state.offer?.status).toBe("expired");
    expect(state.need?.status).toBe("open");
  });

  it("reopens a need after decline and denies planners outside the club", async () => {
    const t = convexTest(schema, modules);
    const fixture = await createFixture(t);
    const sent = await sendFixtureOffer(fixture);
    const declined = await fixture.refereeActor.mutation(
      api.refereeAssignmentCommands.declineOffer,
      {
        offerId: sent.offerId,
        offerVersion: sent.offerVersion,
        declineReasonCode: "unavailable",
        correlationId: `decline-${fixture.matchId}`,
      }
    );
    expect(declined.offerStatus).toBe("declined");
    expect(declined.needStatus).toBe("open");

    const outsiderActor = t.withIdentity({ subject: "outside-planner" });
    await outsiderActor.mutation(api.clubIdentity.syncCurrentAccount, {});
    await expect(
      outsiderActor.query(api.refereeAssignmentQueries.listPlannerQueue, {
        clubId: fixture.clubId,
      })
    ).rejects.toThrow("FORBIDDEN");
  });

  it("revalidates availability before confirmation", async () => {
    const t = convexTest(schema, modules);
    const fixture = await createFixture(t);
    await expect(
      fixture.plannerActor.query(
        api.refereeAssignmentQueries.getPlannerCandidateEligibility,
        {
          needId: fixture.need.needId,
          refereeProfileId: fixture.profileId,
        }
      )
    ).resolves.toMatchObject({ eligible: true, codes: [] });
    const sent = await sendFixtureOffer(fixture);
    const accepted = await fixture.refereeActor.mutation(
      api.refereeAssignmentCommands.acceptOffer,
      {
        offerId: sent.offerId,
        offerVersion: sent.offerVersion,
        correlationId: `accept-before-block-${fixture.matchId}`,
      }
    );
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("refereeAvailabilityWindows", {
        refereeProfileId: fixture.profileId,
        startsAt: fixture.startsAt - 60 * 60 * 1000,
        endsAt: fixture.startsAt + 2 * 60 * 60 * 1000,
        status: "unavailable",
        source: "referee",
        createdAt: now,
        updatedAt: now,
        version: 1,
      });
    });

    await expect(
      fixture.plannerActor.query(
        api.refereeAssignmentQueries.getPlannerCandidateEligibility,
        {
          needId: fixture.need.needId,
          refereeProfileId: fixture.profileId,
        }
      )
    ).resolves.toMatchObject({
      eligible: false,
      codes: ["REFEREE_UNAVAILABLE"],
    });

    await expect(
      fixture.plannerActor.mutation(
        api.refereeAssignmentCommands.confirmAssignment,
        {
          acceptedOfferId: sent.offerId,
          offerVersion: accepted.offerVersion,
          needVersion: accepted.needVersion,
          correlationId: `confirm-after-block-${fixture.matchId}`,
        }
      )
    ).rejects.toThrow("REFEREE_CONFLICT");
  });

  it("creates one active assignment under concurrent confirmation and can reopen it", async () => {
    const t = convexTest(schema, modules);
    const fixture = await createFixture(t);
    const sent = await sendFixtureOffer(fixture);
    const accepted = await fixture.refereeActor.mutation(
      api.refereeAssignmentCommands.acceptOffer,
      {
        offerId: sent.offerId,
        offerVersion: sent.offerVersion,
        correlationId: `accept-concurrent-${fixture.matchId}`,
      }
    );
    const confirmations = await Promise.allSettled([
      fixture.plannerActor.mutation(
        api.refereeAssignmentCommands.confirmAssignment,
        {
          acceptedOfferId: sent.offerId,
          offerVersion: accepted.offerVersion,
          needVersion: accepted.needVersion,
          correlationId: `confirm-a-${fixture.matchId}`,
        }
      ),
      fixture.plannerActor.mutation(
        api.refereeAssignmentCommands.confirmAssignment,
        {
          acceptedOfferId: sent.offerId,
          offerVersion: accepted.offerVersion,
          needVersion: accepted.needVersion,
          correlationId: `confirm-b-${fixture.matchId}`,
        }
      ),
    ]);
    expect(confirmations.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const assignments = await t.run(async (ctx) =>
      await ctx.db
        .query("refereeAssignments")
        .withIndex("by_match_and_status", (q) =>
          q.eq("matchId", fixture.matchId).eq("status", "confirmed")
        )
        .take(10)
    );
    expect(assignments).toHaveLength(1);

    const cancelled = await fixture.plannerActor.mutation(
      api.refereeAssignmentCommands.cancelAssignment,
      {
        assignmentId: assignments[0]._id,
        assignmentVersion: assignments[0].version,
        reason: "Scheidsrechter vervangen",
        reopenNeed: true,
        correlationId: `cancel-${fixture.matchId}`,
      }
    );
    expect(cancelled.assignmentStatus).toBe("cancelled");
    expect(cancelled.needStatus).toBe("open");

    const replacementOffer = await fixture.plannerActor.mutation(
      api.refereeAssignmentCommands.sendOffer,
      {
        needId: fixture.need.needId,
        refereeProfileId: fixture.otherProfileId,
        expiresAt: fixture.startsAt - 7 * 60 * 60 * 1000,
        needVersion: cancelled.needVersion,
        correlationId: `replacement-offer-${fixture.matchId}`,
      }
    );
    expect(replacementOffer.offerStatus).toBe("pending");
    expect(replacementOffer.needStatus).toBe("awaiting_response");

    const oldOffer = await t.run(async (ctx) => await ctx.db.get(sent.offerId));
    expect(oldOffer?.status).toBe("withdrawn");
  });

  it("cancels the referee workflow atomically when a match is cancelled", async () => {
    const t = convexTest(schema, modules);
    const fixture = await createFixture(t);
    const sent = await sendFixtureOffer(fixture);
    const accepted = await fixture.refereeActor.mutation(
      api.refereeAssignmentCommands.acceptOffer,
      {
        offerId: sent.offerId,
        offerVersion: sent.offerVersion,
        correlationId: `accept-before-match-cancel-${fixture.matchId}`,
      }
    );
    const confirmed = await fixture.plannerActor.mutation(
      api.refereeAssignmentCommands.confirmAssignment,
      {
        acceptedOfferId: sent.offerId,
        offerVersion: accepted.offerVersion,
        needVersion: accepted.needVersion,
        correlationId: `confirm-before-match-cancel-${fixture.matchId}`,
      }
    );
    const cancelledAt = Date.now();
    const cancellationArgs = {
      matchId: fixture.matchId,
      cancelledAt,
      actorServiceId: "contract-test",
      correlationId: `match-cancel-${fixture.matchId}`,
    };

    await expect(
      t.run(async (ctx) =>
        await cancelRefereeWorkflowForMatch(ctx, cancellationArgs)
      )
    ).resolves.toEqual({
      matchWasAlreadyCancelled: false,
      needsCancelled: 1,
      offersWithdrawn: 1,
      assignmentsCancelled: 1,
    });

    const state = await t.run(async (ctx) => ({
      match: await ctx.db.get(fixture.matchId),
      need: await ctx.db.get(fixture.need.needId),
      offer: await ctx.db.get(sent.offerId),
      assignment: await ctx.db.get(confirmed.assignmentId),
      audit: await ctx.db
        .query("assignmentAuditEvents")
        .withIndex("by_match_and_created_at", (q) =>
          q.eq("matchId", fixture.matchId)
        )
        .take(100),
    }));
    expect(state.match?.cancelledAt).toBe(cancelledAt);
    expect(state.need?.status).toBe("cancelled");
    expect(state.offer?.status).toBe("withdrawn");
    expect(state.assignment?.status).toBe("cancelled");
    expect(
      state.audit.filter((event) => event.eventType === "offer_withdrawn")
    ).toHaveLength(1);
    expect(
      state.audit.filter((event) => event.eventType === "assignment_cancelled")
    ).toHaveLength(1);
    expect(
      state.audit.filter((event) => event.eventType === "match_cancelled")
    ).toHaveLength(1);

    await expect(
      t.run(async (ctx) =>
        await cancelRefereeWorkflowForMatch(ctx, cancellationArgs)
      )
    ).resolves.toEqual({
      matchWasAlreadyCancelled: true,
      needsCancelled: 0,
      offersWithdrawn: 0,
      assignmentsCancelled: 0,
    });
    const replayAudit = await t.run(async (ctx) =>
      await ctx.db
        .query("assignmentAuditEvents")
        .withIndex("by_match_and_created_at", (q) =>
          q.eq("matchId", fixture.matchId)
        )
        .take(100)
    );
    expect(
      replayAudit.filter((event) => event.eventType === "match_cancelled")
    ).toHaveLength(1);
  });
});
