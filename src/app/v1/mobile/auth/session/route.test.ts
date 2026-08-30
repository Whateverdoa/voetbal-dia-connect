import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";

const convex = vi.hoisted(() => ({
  constructorUrl: "",
  authToken: "",
  mutation: vi.fn(),
  query: vi.fn(),
}));

vi.mock("convex/browser", () => ({
  ConvexHttpClient: class {
    constructor(url: string) {
      convex.constructorUrl = url;
    }

    setAuth(token: string) {
      convex.authToken = token;
    }

    mutation = convex.mutation;
    query = convex.query;
  },
}));

import { POST } from "./route";

const originalConvexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

describe("POST /v1/mobile/auth/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    convex.authToken = "";
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://mobile-test.convex.cloud";
  });

  afterEach(() => {
    if (originalConvexUrl === undefined) {
      delete process.env.NEXT_PUBLIC_CONVEX_URL;
    } else {
      process.env.NEXT_PUBLIC_CONVEX_URL = originalConvexUrl;
    }
  });

  it("forwards Clerk auth and returns the Apple session contract", async () => {
    convex.query.mockResolvedValue({
      profile: {
        id: "account-1",
        displayName: "Test Scheidsrechter",
        email: "referee@dia.test",
      },
      memberships: [
        {
          membershipId: "membership-inactive",
          clubId: "club-old",
          clubName: "Oude club",
          roles: ["coach"],
          status: "inactive",
          version: 3,
        },
        {
          membershipId: "membership-active",
          clubId: "club-dia",
          clubName: "DIA",
          roles: ["referee", "planner"],
          status: "active",
          version: 4,
        },
      ],
    });

    const response = await POST(
      new NextRequest("https://example.test/v1/mobile/auth/session", {
        method: "POST",
        headers: { authorization: "Bearer clerk-token" },
      })
    );

    expect(response.status).toBe(200);
    expect(convex.constructorUrl).toBe("https://mobile-test.convex.cloud");
    expect(convex.authToken).toBe("clerk-token");
    expect(convex.mutation).toHaveBeenCalledWith(
      api.clubIdentity.syncCurrentAccount,
      {}
    );
    expect(convex.query).toHaveBeenCalledWith(
      api.clubIdentity.getMyMobileSession,
      {}
    );
    await expect(response.json()).resolves.toEqual({
      profile: {
        id: "account-1",
        displayName: "Test Scheidsrechter",
        email: "referee@dia.test",
      },
      memberships: [
        {
          id: "membership-inactive",
          clubId: "club-old",
          clubName: "Oude club",
          roles: ["coach"],
          status: "inactive",
          version: 3,
        },
        {
          id: "membership-active",
          clubId: "club-dia",
          clubName: "DIA",
          roles: ["referee", "planner"],
          status: "active",
          version: 4,
        },
      ],
      activeWorkspace: { clubId: "club-dia", clubName: "DIA" },
      token: { provider: "clerk", transport: "bearer" },
    });
  });

  it("rejects a missing bearer token before calling Convex", async () => {
    const response = await POST(
      new NextRequest("https://example.test/v1/mobile/auth/session", {
        method: "POST",
      })
    );

    expect(response.status).toBe(401);
    expect(convex.mutation).not.toHaveBeenCalled();
    expect(convex.query).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "UNAUTHENTICATED" },
    });
  });
});
