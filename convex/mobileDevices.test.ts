/// <reference types="vite/client" />
// @vitest-environment edge-runtime

import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { testHelpers } from "./mobileDevices";

const modules = import.meta.glob([
  "./**/*.ts",
  "!./**/*.test.ts",
  "!./auth.config.ts",
]);

describe("mobile device registration", () => {
  it("registers idempotently and lets only the owner disable a device", async () => {
    const t = convexTest(schema, modules);
    const owner = t.withIdentity({ subject: "device-owner" });
    const other = t.withIdentity({ subject: "device-other" });
    await owner.mutation(api.clubIdentity.syncCurrentAccount, {});
    await other.mutation(api.clubIdentity.syncCurrentAccount, {});
    const token = "ab".repeat(32);

    const first = await owner.mutation(api.mobileDevices.registerMyDevice, {
      apnsToken: token.toUpperCase(),
      platform: "ios",
      appVersion: "0.1.0",
    });
    const replay = await owner.mutation(api.mobileDevices.registerMyDevice, {
      apnsToken: token,
      platform: "ipados",
      appVersion: "0.1.1",
    });

    expect(replay).toMatchObject({
      deviceId: first.deviceId,
      platform: "ipados",
      appVersion: "0.1.1",
      status: "active",
    });
    await expect(
      other.mutation(api.mobileDevices.unregisterMyDevice, {
        deviceId: first.deviceId,
      })
    ).rejects.toThrow("FORBIDDEN");
    await expect(
      owner.mutation(api.mobileDevices.unregisterMyDevice, {
        deviceId: first.deviceId,
      })
    ).resolves.toEqual({ success: true });
    await expect(owner.query(api.mobileDevices.listMyDevices, {})).resolves.toEqual([
      expect.objectContaining({ deviceId: first.deviceId, status: "disabled" }),
    ]);
  });

  it("rejects malformed tokens and app versions", () => {
    expect(() => testHelpers.validateToken("not-a-token")).toThrow(
      "VALIDATION_ERROR"
    );
    expect(() => testHelpers.validateAppVersion(" ")).toThrow(
      "VALIDATION_ERROR"
    );
  });
});
