/// <reference types="vite/client" />
// @vitest-environment edge-runtime

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import type { ClubRole } from "./lib/clubAccess";

const modules = import.meta.glob([
  "./**/*.ts",
  "!./**/*.test.ts",
  "!./auth.config.ts",
]);

describe("club identity and authorization", () => {
  it("allows every active club role in its own club and denies cross-club access", async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity({
      subject: "admin-user",
      email: "admin@jeugdvoetbal.test",
      name: "Test Admin",
    });
    const adminAccount = await asAdmin.mutation(
      api.clubIdentity.syncCurrentAccount,
      {}
    );
    const { clubA, clubB } = await t.run(async (ctx) => {
      const now = Date.now();
      return {
        clubA: await ctx.db.insert("clubs", {
          name: "Testclub A",
          slug: "testclub-a",
          createdAt: now,
        }),
        clubB: await ctx.db.insert("clubs", {
          name: "Testclub B",
          slug: "testclub-b",
          createdAt: now,
        }),
      };
    });

    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("clubMemberships", {
        clubId: clubA,
        userId: adminAccount.userId,
        roles: ["club_admin"],
        status: "active",
        createdAt: now,
        updatedAt: now,
        version: 1,
      });
    });

    const roles: ClubRole[] = ["club_admin", "planner", "coach", "referee"];
    for (const role of roles) {
      const actor = t.withIdentity({
        subject: `${role}-user`,
        email: `${role}@jeugdvoetbal.test`,
        name: `Test ${role}`,
      });
      const account = await actor.mutation(
        api.clubIdentity.syncCurrentAccount,
        {}
      );
      await asAdmin.mutation(api.clubIdentity.setClubMembership, {
        clubId: clubA,
        userId: account.userId,
        roles: [role],
        status: "active",
        correlationId: `membership-${role}`,
      });

      const ownClub = await actor.query(api.clubIdentity.getClubContext, {
        clubId: clubA,
      });
      expect(ownClub.roles).toEqual([role]);
      await expect(
        actor.query(api.clubIdentity.getClubContext, { clubId: clubB })
      ).rejects.toThrow("FORBIDDEN");
    }
  });

  it("allows only a club admin to manage memberships in that club", async () => {
    const t = convexTest(schema, modules);
    const asAdmin = t.withIdentity({ subject: "admin" });
    const asPlanner = t.withIdentity({ subject: "planner" });
    const target = t.withIdentity({ subject: "target" });
    const admin = await asAdmin.mutation(api.clubIdentity.syncCurrentAccount, {});
    const planner = await asPlanner.mutation(api.clubIdentity.syncCurrentAccount, {});
    const targetAccount = await target.mutation(
      api.clubIdentity.syncCurrentAccount,
      {}
    );
    const clubId = await t.run(async (ctx) => {
      const now = Date.now();
      const id = await ctx.db.insert("clubs", {
        name: "Authorization Testclub",
        slug: "authorization-testclub",
        createdAt: now,
      });
      await ctx.db.insert("clubMemberships", {
        clubId: id,
        userId: admin.userId,
        roles: ["club_admin"],
        status: "active",
        createdAt: now,
        updatedAt: now,
        version: 1,
      });
      await ctx.db.insert("clubMemberships", {
        clubId: id,
        userId: planner.userId,
        roles: ["planner"],
        status: "active",
        createdAt: now,
        updatedAt: now,
        version: 1,
      });
      return id;
    });

    await expect(
      asPlanner.mutation(api.clubIdentity.setClubMembership, {
        clubId,
        userId: targetAccount.userId,
        roles: ["referee"],
        status: "active",
        correlationId: "planner-cannot-grant",
      })
    ).rejects.toThrow("FORBIDDEN");

    const result = await asAdmin.mutation(
      api.clubIdentity.setClubMembership,
      {
        clubId,
        userId: targetAccount.userId,
        roles: ["referee"],
        status: "active",
        correlationId: "admin-grants-referee",
      }
    );
    expect(result.created).toBe(true);
    const replay = await asAdmin.mutation(
      api.clubIdentity.setClubMembership,
      {
        clubId,
        userId: targetAccount.userId,
        roles: ["referee"],
        status: "active",
        correlationId: "admin-grants-referee",
      }
    );
    expect(replay).toEqual(result);
    await expect(
      asAdmin.mutation(api.clubIdentity.setClubMembership, {
        clubId,
        userId: targetAccount.userId,
        roles: ["coach"],
        status: "active",
        correlationId: "admin-grants-referee",
      })
    ).rejects.toThrow("IDEMPOTENCY_CONFLICT");

    const audit = await t.run(async (ctx) =>
      await ctx.db
        .query("assignmentAuditEvents")
        .withIndex("by_correlation", (q) =>
          q.eq("correlationId", "admin-grants-referee")
        )
        .unique()
    );
    expect(audit?.eventType).toBe("membership_created");
  });
});
