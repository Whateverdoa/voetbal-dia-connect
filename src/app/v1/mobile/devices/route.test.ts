import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";

const convex = vi.hoisted(() => ({
  authToken: "",
  mutation: vi.fn(),
}));

vi.mock("convex/browser", () => ({
  ConvexHttpClient: class {
    setAuth(token: string) {
      convex.authToken = token;
    }

    mutation = convex.mutation;
  },
}));

import { POST } from "./route";

const originalConvexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

describe("POST /v1/mobile/devices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://mobile-test.convex.cloud";
  });

  afterEach(() => {
    if (originalConvexUrl === undefined) {
      delete process.env.NEXT_PUBLIC_CONVEX_URL;
    } else {
      process.env.NEXT_PUBLIC_CONVEX_URL = originalConvexUrl;
    }
  });

  it("forwards the bearer token and returns an opaque device id", async () => {
    convex.mutation.mockResolvedValue({
      deviceId: "device_123",
      platform: "ios",
      environment: "sandbox",
      appVersion: "0.1.0(1)",
      status: "active",
    });
    const response = await POST(
      new NextRequest("https://example.test/v1/mobile/devices", {
        method: "POST",
        headers: {
          authorization: "Bearer clerk-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          apns_token: "ab".repeat(32),
          platform: "ios",
          app_version: "0.1.0(1)",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(convex.authToken).toBe("clerk-token");
    expect(convex.mutation).toHaveBeenCalledWith(
      api.mobileDevices.registerMyDevice,
      {
        apnsToken: "ab".repeat(32),
        platform: "ios",
        appVersion: "0.1.0(1)",
      }
    );
    await expect(response.json()).resolves.toMatchObject({
      deviceId: "device_123",
      status: "active",
    });
  });

  it("rejects an unsupported platform before calling Convex", async () => {
    const response = await POST(
      new NextRequest("https://example.test/v1/mobile/devices", {
        method: "POST",
        headers: {
          authorization: "Bearer clerk-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          apnsToken: "ab".repeat(32),
          platform: "android",
          appVersion: "0.1.0(1)",
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(convex.mutation).not.toHaveBeenCalled();
  });
});
