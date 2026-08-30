import type { NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";
import {
  MobileApiError,
  optionalString,
  readJsonObject,
  withMobileRequest,
} from "@/lib/mobile/mobileApi";

export async function POST(request: NextRequest) {
  return await withMobileRequest(request, async ({ convex }) => {
    const body = await readJsonObject(request);
    const apnsToken = optionalString(body, "apnsToken", 200);
    const appVersion = optionalString(body, "appVersion", 50);
    const platform = body.platform;
    if (
      !apnsToken ||
      !appVersion ||
      (platform !== "ios" && platform !== "ipados")
    ) {
      throw new MobileApiError("VALIDATION_ERROR");
    }
    const device = await convex.mutation(api.mobileDevices.registerMyDevice, {
      apnsToken,
      platform,
      appVersion,
    });
    return {
      deviceId: String(device.deviceId),
      platform: device.platform,
      environment: device.environment,
      appVersion: device.appVersion,
      status: device.status,
    };
  });
}
