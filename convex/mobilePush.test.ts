/// <reference types="vite/client" />
// @vitest-environment edge-runtime

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { internal } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob([
  "./**/*.ts",
  "!./**/*.test.ts",
  "!./auth.config.ts",
]);

describe("mobile push delivery recovery", () => {
  it("leases a claimed delivery and reclaims it only after the lease", async () => {
    const t = convexTest(schema, modules);
    const deliveryId = await t.run(async (ctx) => {
      const now = Date.now();
      const userId = await ctx.db.insert("appUsers", {
        tokenIdentifier: "push-lease-user",
        clerkSubject: "push-lease-user",
        createdAt: now,
        updatedAt: now,
      });
      const deviceId = await ctx.db.insert("mobileDevices", {
        userId,
        apnsToken: "ab".repeat(32),
        platform: "ios",
        environment: "sandbox",
        appVersion: "0.1.0",
        status: "active",
        lastRegisteredAt: now,
        createdAt: now,
        updatedAt: now,
      });
      return await ctx.db.insert("mobilePushDeliveries", {
        recipientUserId: userId,
        deviceId,
        notificationType: "offer_sent",
        routeType: "referee_offer",
        resourceId: "offer_lease_test",
        eventKey: "offer_sent:offer_lease_test:1",
        status: "pending",
        attemptCount: 0,
        nextAttemptAt: now,
        createdAt: now,
        updatedAt: now,
      });
    });

    const firstClaim = await t.mutation(internal.mobilePush.claimDelivery, {
      deliveryId,
    });
    const duplicateClaim = await t.mutation(internal.mobilePush.claimDelivery, {
      deliveryId,
    });

    expect(firstClaim?.attemptCount).toBe(1);
    expect(duplicateClaim).toBeNull();

    await t.run(async (ctx) => {
      await ctx.db.patch(deliveryId, { nextAttemptAt: Date.now() - 1 });
    });
    const recoveredClaim = await t.mutation(internal.mobilePush.claimDelivery, {
      deliveryId,
    });
    expect(recoveredClaim?.attemptCount).toBe(2);
  });
});
