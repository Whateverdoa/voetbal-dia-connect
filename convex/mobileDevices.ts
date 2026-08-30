import { v } from "convex/values";
import { authenticatedMutation, authenticatedQuery } from "./lib/clubAccess";
import {
  mobileDeviceEnvironmentValidator,
  mobileDevicePlatformValidator,
  mobileDeviceStatusValidator,
} from "./refereeAssignmentSchema";

const deviceSummaryValidator = v.object({
  deviceId: v.id("mobileDevices"),
  platform: mobileDevicePlatformValidator,
  environment: mobileDeviceEnvironmentValidator,
  appVersion: v.string(),
  status: mobileDeviceStatusValidator,
});

function validateToken(token: string) {
  const normalized = token.trim().toLowerCase();
  if (!/^[a-f0-9]{64,200}$/.test(normalized)) {
    throw new Error("VALIDATION_ERROR");
  }
  return normalized;
}

function validateAppVersion(appVersion: string) {
  const normalized = appVersion.trim();
  if (!normalized || normalized.length > 50) {
    throw new Error("VALIDATION_ERROR");
  }
  return normalized;
}

function currentEnvironment(): "sandbox" | "production" {
  return process.env.APNS_ENVIRONMENT === "production"
    ? "production"
    : "sandbox";
}

export const registerMyDevice = authenticatedMutation({
  args: {
    apnsToken: v.string(),
    platform: mobileDevicePlatformValidator,
    appVersion: v.string(),
  },
  returns: deviceSummaryValidator,
  handler: async (ctx, args) => {
    const apnsToken = validateToken(args.apnsToken);
    const appVersion = validateAppVersion(args.appVersion);
    const environment = currentEnvironment();
    const now = Date.now();
    const existing = await ctx.db
      .query("mobileDevices")
      .withIndex("by_apns_token", (q) => q.eq("apnsToken", apnsToken))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        userId: ctx.user._id,
        platform: args.platform,
        environment,
        appVersion,
        status: "active",
        lastRegisteredAt: now,
        disabledAt: undefined,
        disableReason: undefined,
        updatedAt: now,
      });
      return {
        deviceId: existing._id,
        platform: args.platform,
        environment,
        appVersion,
        status: "active" as const,
      };
    }

    const deviceId = await ctx.db.insert("mobileDevices", {
      userId: ctx.user._id,
      apnsToken,
      platform: args.platform,
      environment,
      appVersion,
      status: "active",
      lastRegisteredAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return {
      deviceId,
      platform: args.platform,
      environment,
      appVersion,
      status: "active" as const,
    };
  },
});

export const unregisterMyDevice = authenticatedMutation({
  args: { deviceId: v.id("mobileDevices") },
  returns: v.object({ success: v.boolean() }),
  handler: async (ctx, args) => {
    const device = await ctx.db.get(args.deviceId);
    if (!device) return { success: true };
    if (device.userId !== ctx.user._id) throw new Error("FORBIDDEN");
    if (device.status === "active") {
      const now = Date.now();
      await ctx.db.patch(device._id, {
        status: "disabled",
        disabledAt: now,
        disableReason: "user_unregistered",
        updatedAt: now,
      });
    }
    return { success: true };
  },
});

export const listMyDevices = authenticatedQuery({
  args: {},
  returns: v.array(deviceSummaryValidator),
  handler: async (ctx) => {
    const devices = await ctx.db
      .query("mobileDevices")
      .withIndex("by_user", (q) => q.eq("userId", ctx.user._id))
      .take(20);
    return devices.map((device) => ({
      deviceId: device._id,
      platform: device.platform,
      environment: device.environment,
      appVersion: device.appVersion,
      status: device.status,
    }));
  },
});

export const testHelpers = { validateToken, validateAppVersion };
