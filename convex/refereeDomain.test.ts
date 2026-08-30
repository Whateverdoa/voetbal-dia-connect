/// <reference types="vite/client" />
// @vitest-environment edge-runtime

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob([
  "./**/*.ts",
  "!./**/*.test.ts",
  "!./auth.config.ts",
]);

describe("referee domain authorization", () => {
  it("keeps planner-only profile fields away from referee and coach queries", async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity({ subject: "admin" });
    const asPlanner = t.withIdentity({ subject: "planner" });
    const asCoach = t.withIdentity({ subject: "coach" });
    const asReferee = t.withIdentity({ subject: "referee" });
    const admin = await asAdmin.mutation(api.clubIdentity.syncCurrentAccount, {});
    const planner = await asPlanner.mutation(api.clubIdentity.syncCurrentAccount, {});
    const coach = await asCoach.mutation(api.clubIdentity.syncCurrentAccount, {});
    const referee = await asReferee.mutation(api.clubIdentity.syncCurrentAccount, {});
    const { clubA, clubB } = await t.run(async (ctx) => {
      const now = Date.now();
      const clubA = await ctx.db.insert("clubs", {
        name: "Domain Club A",
        slug: "domain-club-a",
        createdAt: now,
      });
      const clubB = await ctx.db.insert("clubs", {
        name: "Domain Club B",
        slug: "domain-club-b",
        createdAt: now,
      });
      for (const membership of [
        { userId: admin.userId, roles: ["club_admin"] as const },
        { userId: planner.userId, roles: ["planner"] as const },
        { userId: coach.userId, roles: ["coach"] as const },
        { userId: referee.userId, roles: ["referee"] as const },
      ]) {
        await ctx.db.insert("clubMemberships", {
          clubId: clubA,
          userId: membership.userId,
          roles: [...membership.roles],
          status: "active",
          createdAt: now,
          updatedAt: now,
          version: 1,
        });
      }
      return { clubA, clubB };
    });

    const created = await asPlanner.mutation(
      api.refereeDomain.upsertRefereeProfile,
      {
        clubId: clubA,
        userId: referee.userId,
        displayName: "Referee Test",
        status: "active",
        qualificationLevel: "club-jeugd",
        privatePlannerNotes: "Alleen zichtbaar voor planning",
        correlationId: "profile-create",
      }
    );
    expect(created.created).toBe(true);
    const profileReplay = await asPlanner.mutation(
      api.refereeDomain.upsertRefereeProfile,
      {
        clubId: clubA,
        userId: referee.userId,
        displayName: "Referee Test",
        status: "active",
        qualificationLevel: "club-jeugd",
        privatePlannerNotes: "Alleen zichtbaar voor planning",
        correlationId: "profile-create",
      }
    );
    expect(profileReplay).toEqual(created);

    const ownProfile = await asReferee.query(
      api.refereeDomain.getMyRefereeProfile,
      { clubId: clubA }
    );
    expect(ownProfile?.displayName).toBe("Referee Test");
    expect(ownProfile).not.toHaveProperty("privatePlannerNotes");

    const plannerProfiles = await asPlanner.query(
      api.refereeDomain.listPlannerRefereeProfiles,
      { clubId: clubA }
    );
    expect(plannerProfiles[0].privatePlannerNotes).toBe(
      "Alleen zichtbaar voor planning"
    );
    await expect(
      asCoach.query(api.refereeDomain.listPlannerRefereeProfiles, {
        clubId: clubA,
      })
    ).rejects.toThrow("FORBIDDEN");
    await expect(
      asReferee.query(api.refereeDomain.getMyRefereeProfile, {
        clubId: clubB,
      })
    ).rejects.toThrow("FORBIDDEN");
  });

  it("allows a referee to manage only their own availability", async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity({ subject: "admin-availability" });
    const asReferee = t.withIdentity({ subject: "referee-availability" });
    const admin = await asAdmin.mutation(api.clubIdentity.syncCurrentAccount, {});
    const referee = await asReferee.mutation(api.clubIdentity.syncCurrentAccount, {});
    const clubId = await t.run(async (ctx) => {
      const now = Date.now();
      const clubId = await ctx.db.insert("clubs", {
        name: "Availability Club",
        slug: "availability-club",
        createdAt: now,
      });
      await ctx.db.insert("clubMemberships", {
        clubId,
        userId: admin.userId,
        roles: ["club_admin"],
        status: "active",
        createdAt: now,
        updatedAt: now,
        version: 1,
      });
      await ctx.db.insert("clubMemberships", {
        clubId,
        userId: referee.userId,
        roles: ["referee"],
        status: "active",
        createdAt: now,
        updatedAt: now,
        version: 1,
      });
      return clubId;
    });
    await asAdmin.mutation(api.refereeDomain.upsertRefereeProfile, {
      clubId,
      userId: referee.userId,
      displayName: "Availability Referee",
      status: "active",
      correlationId: "availability-profile",
    });

    const startsAt = Date.now() + 60_000;
    const created = await asReferee.mutation(
      api.refereeDomain.createMyAvailability,
      {
        clubId,
        startsAt,
        endsAt: startsAt + 3_600_000,
        status: "available",
        correlationId: "availability-create",
      }
    );
    const replay = await asReferee.mutation(
      api.refereeDomain.createMyAvailability,
      {
        clubId,
        startsAt,
        endsAt: startsAt + 3_600_000,
        status: "available",
        correlationId: "availability-create",
      }
    );
    expect(replay).toEqual(created);
    await expect(
      asReferee.mutation(api.refereeDomain.createMyAvailability, {
        clubId,
        startsAt,
        endsAt: startsAt + 7_200_000,
        status: "available",
        correlationId: "availability-create",
      })
    ).rejects.toThrow("IDEMPOTENCY_CONFLICT");
    const windows = await asReferee.query(
      api.refereeDomain.listMyAvailability,
      {
        clubId,
        from: startsAt - 1,
        to: startsAt + 3_600_001,
      }
    );
    expect(windows).toHaveLength(1);
    expect(windows[0].status).toBe("available");
  });
});
