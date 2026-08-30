/// <reference types="vite/client" />
// @vitest-environment edge-runtime

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
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
    const sent = await sendFixtureOffer(fixture);
    const pendingOffers = await fixture.refereeActor.query(
      api.refereeAssignmentQueries.listMyOffers,
      { clubId: fixture.clubId, status: "pending" }
    );
    expect(pendingOffers).toHaveLength(1);
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
});
